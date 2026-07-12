import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { maintenanceRepository } from '../repositories/maintenance.repository';
import { assetsRepository } from '../repositories/assets.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { notify, broadcastActivity } from './notifications.service';
import { ASSET_STATUS } from '../constants/status';
import { ASSET_ACTIONS, canTransition } from '../constants/asset-lifecycle';
import { logger } from '../config/logger';
import type {
  AssignMaintenanceInput,
  CreateMaintenanceInput,
  MaintenanceActionInput,
  MaintenanceListQuery,
  ResolveMaintenanceInput,
} from '../validators/maintenance';

interface Actor {
  id: string;
}

/** Maintenance state machine. */
const MAINTENANCE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  REJECTED: [],
  CANCELLED: [],
};

function canMaintenanceTransition(from: string, to: string): boolean {
  return MAINTENANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export const maintenanceService = {
  async list(query: MaintenanceListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await maintenanceRepository.findList({
      page,
      limit,
      skip,
      status: query.status,
      priority: query.priority,
      assetId: query.assetId,
      employeeId: query.employeeId,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new NotFoundError('Maintenance request not found');
    return request;
  },

  /**
   * Raise a new maintenance request. When the asset is currently AVAILABLE
   * we transition it to MAINTENANCE atomically so it can't be double-booked
   * for allocation while the technician is working on it.
   */
  async create(input: CreateMaintenanceInput, actor: Actor) {
    const asset = await assetsRepository.findById(input.assetId);
    if (!asset) throw new ValidationError('Asset not found');

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRequest.create({
        data: {
          assetId: input.assetId,
          requestedById: actor.id,
          status: 'PENDING',
          priority: input.priority ?? 'MEDIUM',
          issueType: input.issueType,
          description: input.description,
          reportedCondition: input.reportedCondition,
          dueDate: input.dueDate,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        include: maintenanceRepository.detailInclude,
      });
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: created.id,
          action: 'CREATED',
          status: 'PENDING',
          note: input.description,
          performedBy: actor.id,
        },
      });
      // If AVAILABLE we optimistically move to MAINTENANCE.
      if (
        asset.status === ASSET_STATUS.AVAILABLE &&
        canTransition(asset.status, ASSET_STATUS.MAINTENANCE)
      ) {
        const update = await tx.asset.updateMany({
          where: { id: input.assetId, version: asset.version },
          data: { status: ASSET_STATUS.MAINTENANCE, version: { increment: 1 } },
        });
        if (update.count > 0) {
          await tx.assetStatusHistory.create({
            data: {
              assetId: input.assetId,
              fromStatus: ASSET_STATUS.AVAILABLE,
              toStatus: ASSET_STATUS.MAINTENANCE,
              reason: `Maintenance request ${created.id}`,
              changedBy: actor.id,
            },
          });
          await tx.assetHistory.create({
            data: {
              assetId: input.assetId,
              action: ASSET_ACTIONS.MAINTENANCE,
              note: created.id,
              performedBy: actor.id,
            },
          });
        }
      }
      return created;
    });

    broadcastActivity('maintenance.created', { requestId: request.id, assetId: input.assetId });
    logger.info('maintenance.created', { id: request.id, actorId: actor.id });
    return request;
  },

  /**
   * Assign a technician to a pending request. Moves the request to ASSIGNED
   * and records the assignment history row.
   */
  async assign(id: string, input: AssignMaintenanceInput, actor: Actor) {
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new NotFoundError('Maintenance request not found');
    if (!canMaintenanceTransition(request.status, 'ASSIGNED')) {
      throw new ConflictError(`Cannot assign a ${request.status.toLowerCase()} request`);
    }
    const technician = await prisma.user.findFirst({
      where: { id: input.technicianId, isActive: true, deletedAt: null },
    });
    if (!technician) throw new ValidationError('Technician not found or inactive');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.maintenanceAssignment.create({
        data: {
          maintenanceRequestId: id,
          technicianId: input.technicianId,
          assignedBy: actor.id,
          status: 'ASSIGNED',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      const record = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'ASSIGNED', updatedBy: actor.id },
        include: maintenanceRepository.detailInclude,
      });
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          action: 'ASSIGNED',
          status: 'ASSIGNED',
          note: input.note ?? `Assigned to technician ${input.technicianId}`,
          performedBy: actor.id,
        },
      });
      await notify(
        {
          userId: input.technicianId,
          title: 'Maintenance assigned to you',
          message: `Please review maintenance request for ${request.asset.assetTag}.`,
          priority:
            (request.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined) ?? 'MEDIUM',
          type: 'MAINTENANCE_ASSIGNED',
          entityType: 'maintenance',
          entityId: id,
        },
        tx,
      );
      return record;
    });

    broadcastActivity('maintenance.assigned', { requestId: id });
    return updated;
  },

  /** Move an ASSIGNED request to IN_PROGRESS, REJECTED, or CANCELLED. */
  async apply(id: string, input: MaintenanceActionInput, actor: Actor) {
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new NotFoundError('Maintenance request not found');
    const target =
      input.action === 'start'
        ? 'IN_PROGRESS'
        : input.action === 'reject'
          ? 'REJECTED'
          : 'CANCELLED';
    if (!canMaintenanceTransition(request.status, target)) {
      throw new ConflictError(`Cannot ${input.action} a ${request.status.toLowerCase()} request`);
    }
    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: target as Prisma.MaintenanceRequestUpdateInput['status'],
          updatedBy: actor.id,
        },
        include: maintenanceRepository.detailInclude,
      });
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          action: input.action.toUpperCase(),
          status: target as Prisma.MaintenanceHistoryUncheckedCreateInput['status'],
          note: input.reason,
          performedBy: actor.id,
        },
      });
      return record;
    });
    broadcastActivity(`maintenance.${input.action}`, { requestId: id });
    return updated;
  },

  /**
   * Resolve an IN_PROGRESS request. Records the resolution + returns the
   * asset to AVAILABLE (via optimistic version bump).
   */
  async resolve(id: string, input: ResolveMaintenanceInput, actor: Actor) {
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new NotFoundError('Maintenance request not found');
    if (!canMaintenanceTransition(request.status, 'RESOLVED')) {
      throw new ConflictError(`Cannot resolve a ${request.status.toLowerCase()} request`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'RESOLVED', updatedBy: actor.id },
        include: maintenanceRepository.detailInclude,
      });
      await tx.maintenanceResolution.create({
        data: {
          maintenanceRequestId: id,
          resolvedBy: actor.id,
          resolutionNotes: input.resolutionNotes,
          cost: input.cost as unknown as Prisma.Decimal | undefined,
          partsReplaced: input.partsReplaced,
          resolvedAt: new Date(),
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          action: 'RESOLVED',
          status: 'RESOLVED',
          note: input.resolutionNotes,
          performedBy: actor.id,
        },
      });
      // Return asset to AVAILABLE when it was in MAINTENANCE.
      const asset = await tx.asset.findFirst({
        where: { id: request.assetId, deletedAt: null },
        select: { status: true, version: true },
      });
      if (asset && asset.status === ASSET_STATUS.MAINTENANCE) {
        const bump = await tx.asset.updateMany({
          where: { id: request.assetId, version: asset.version },
          data: { status: ASSET_STATUS.AVAILABLE, version: { increment: 1 }, updatedBy: actor.id },
        });
        if (bump.count > 0) {
          await tx.assetStatusHistory.create({
            data: {
              assetId: request.assetId,
              fromStatus: ASSET_STATUS.MAINTENANCE,
              toStatus: ASSET_STATUS.AVAILABLE,
              reason: `Maintenance ${id} resolved`,
              changedBy: actor.id,
            },
          });
          await tx.assetHistory.create({
            data: {
              assetId: request.assetId,
              action: ASSET_ACTIONS.MAINTENANCE_RESOLVED,
              note: id,
              performedBy: actor.id,
            },
          });
        }
      }
      return record;
    });

    broadcastActivity('maintenance.resolved', { requestId: id });
    logger.info('maintenance.resolved', { id, actorId: actor.id });
    return updated;
  },
};
