import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { auditRepository } from '../repositories/audit.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { broadcastActivity } from './notifications.service';
import { logger } from '../config/logger';
import type {
  CreateCycleInput,
  CreateDiscrepancyInput,
  CycleListQuery,
  ResolveDiscrepancyInput,
  UpdateCycleInput,
  VerifyRecordInput,
} from '../validators/audit';

interface Actor {
  id: string;
}

const AUDIT_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

function canAuditTransition(from: string, to: string): boolean {
  return AUDIT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const auditService = {
  async listCycles(query: CycleListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await auditRepository.findCycleList({
      skip,
      take: limit,
      status: query.status,
      departmentId: query.departmentId,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  async getCycle(id: string) {
    const cycle = await auditRepository.findCycleById(id);
    if (!cycle) throw new NotFoundError('Audit cycle not found');
    return cycle;
  },

  /**
   * Create an audit cycle and optionally seed a checklist of records — one
   * per asset id supplied. If no asset ids are given the cycle is created
   * empty and records can be added later.
   */
  async createCycle(input: CreateCycleInput, actor: Actor) {
    const clash = await auditRepository.findCycleByCode(input.code);
    if (clash) throw new ConflictError('An audit cycle with this code already exists');

    return prisma.$transaction(async (tx) => {
      const cycle = await tx.auditCycle.create({
        data: {
          name: input.name,
          code: input.code.toUpperCase(),
          scope: input.scope,
          departmentId: input.departmentId ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'PLANNED',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.auditAssignment.create({
        data: {
          auditCycleId: cycle.id,
          auditorId: actor.id,
          assignedAt: new Date(),
          scopeNote: input.scope,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      if (input.assetIds && input.assetIds.length > 0) {
        await tx.auditRecord.createMany({
          data: input.assetIds.map((assetId) => ({
            auditCycleId: cycle.id,
            assetId,
            status: 'PENDING',
            isVerified: false,
            createdBy: actor.id,
            updatedBy: actor.id,
          })),
          skipDuplicates: true,
        });
      }
      await tx.auditHistory.create({
        data: {
          auditCycleId: cycle.id,
          action: 'CREATED',
          status: 'PLANNED',
          note: `Cycle created${input.assetIds?.length ? ` with ${input.assetIds.length} records` : ''}`,
        },
      });
      broadcastActivity('audit.cycle.created', { cycleId: cycle.id });
      logger.info('audit.cycle.created', { cycleId: cycle.id, actorId: actor.id });
      return cycle;
    });
  },

  async updateCycle(id: string, input: UpdateCycleInput, actor: Actor) {
    const cycle = await auditRepository.findCycleById(id);
    if (!cycle) throw new NotFoundError('Audit cycle not found');
    if (input.status && input.status !== cycle.status) {
      if (!canAuditTransition(cycle.status, input.status)) {
        throw new ConflictError(`Cannot transition audit from ${cycle.status} to ${input.status}`);
      }
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.auditCycle.update({
        where: { id },
        data: {
          name: input.name,
          scope: input.scope,
          departmentId: input.departmentId ?? undefined,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          closedAt: input.status === 'CLOSED' ? new Date() : undefined,
          updatedBy: actor.id,
        },
      });
      if (input.status) {
        await tx.auditHistory.create({
          data: {
            auditCycleId: id,
            action: `STATUS_${input.status}`,
            status: input.status,
            performedBy: actor.id,
          },
        });
        broadcastActivity('audit.cycle.status', { cycleId: id, status: input.status });
      }
      return updated;
    });
  },

  /** Add an audit record (checklist item) for a specific asset. */
  async addRecord(cycleId: string, assetId: string, actor: Actor) {
    const cycle = await auditRepository.findCycleById(cycleId);
    if (!cycle) throw new NotFoundError('Audit cycle not found');
    if (['CLOSED', 'CANCELLED', 'COMPLETED'].includes(cycle.status)) {
      throw new ConflictError('Cannot add records to a closed cycle');
    }
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
      select: { id: true, assetTag: true },
    });
    if (!asset) throw new ValidationError('Asset not found');
    return prisma.auditRecord.upsert({
      where: { auditCycleId_assetId: { auditCycleId: cycleId, assetId } },
      update: {},
      create: {
        auditCycleId: cycleId,
        assetId,
        status: 'PENDING',
        isVerified: false,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  },

  /** Verify (or mark discrepant) an audit record. */
  async verifyRecord(recordId: string, input: VerifyRecordInput, actor: Actor) {
    const record = await auditRepository.findRecordById(recordId);
    if (!record) throw new NotFoundError('Audit record not found');
    if (record.auditCycle.status === 'CLOSED' || record.auditCycle.status === 'CANCELLED') {
      throw new ConflictError('Cannot modify records in a closed cycle');
    }
    const status = input.isVerified ? 'VERIFIED' : 'DISCREPANCY';
    return prisma.auditRecord.update({
      where: { id: recordId },
      data: {
        status,
        foundCondition: input.foundCondition,
        foundLocationId: input.foundLocationId ?? undefined,
        isVerified: input.isVerified,
        verifiedBy: input.isVerified ? actor.id : null,
        verifiedAt: input.isVerified ? new Date() : null,
        note: input.note,
        updatedBy: actor.id,
      },
      include: { discrepancies: { where: { deletedAt: null } } },
    });
  },

  async addDiscrepancy(recordId: string, input: CreateDiscrepancyInput, actor: Actor) {
    const record = await auditRepository.findRecordById(recordId);
    if (!record) throw new NotFoundError('Audit record not found');
    return prisma.auditDiscrepancy.create({
      data: {
        auditRecordId: recordId,
        type: input.type,
        description: input.description,
        severity: input.severity as Prisma.AuditDiscrepancyCreateInput['severity'],
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  },

  async resolveDiscrepancy(discrepancyId: string, input: ResolveDiscrepancyInput, actor: Actor) {
    const found = await prisma.auditDiscrepancy.findFirst({
      where: { id: discrepancyId, deletedAt: null },
    });
    if (!found) throw new NotFoundError('Discrepancy not found');
    if (found.resolved) throw new ConflictError('Discrepancy already resolved');
    return prisma.auditDiscrepancy.update({
      where: { id: discrepancyId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        description: input.note ?? found.description,
        updatedBy: actor.id,
      },
    });
  },
};
