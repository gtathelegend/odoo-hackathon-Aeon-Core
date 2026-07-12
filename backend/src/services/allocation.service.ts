import { prisma } from '../config/database';
import { allocationRepository } from '../repositories/allocation.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ROLES, type Role } from '../constants/roles';
import { notify, broadcastActivity } from './notifications.service';
import { logger } from '../config/logger';
import type { AllocationListQuery, ExtendAllocationInput } from '../validators/allocation';

interface Actor {
  id: string;
  role: Role;
  departmentId?: string | null;
}

function scopeDeptFilter(actor: Actor): string | undefined {
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER) return undefined;
  return actor.departmentId ?? '00000000-0000-0000-0000-000000000000';
}

export const allocationService = {
  async list(query: AllocationListQuery, actor: Actor) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const departmentId = query.departmentId ?? scopeDeptFilter(actor);

    const [items, total] = await allocationRepository.findList({
      page,
      limit,
      skip,
      status: query.status,
      employeeId: query.employeeId,
      assetId: query.assetId,
      departmentId,
      overdueOnly: query.overdueOnly,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getById(id: string, actor: Actor) {
    const allocation = await allocationRepository.findById(id);
    if (!allocation) throw new NotFoundError('Allocation not found');
    const dept = scopeDeptFilter(actor);
    if (dept && allocation.employee.department?.id !== dept) {
      throw new NotFoundError('Allocation not found');
    }
    return allocation;
  },

  /**
   * Extend the expected return date. Only pending/active/overdue allocations
   * can be extended; the new date must be strictly in the future.
   */
  async extend(id: string, input: ExtendAllocationInput, actor: Actor) {
    if (input.expectedReturnDate.getTime() <= Date.now()) {
      throw new ValidationError('expectedReturnDate must be in the future');
    }
    const allocation = await allocationRepository.findById(id);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (!['PENDING', 'ACTIVE', 'OVERDUE'].includes(allocation.status)) {
      throw new ConflictError(`Cannot extend a ${allocation.status.toLowerCase()} allocation`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.allocation.update({
        where: { id },
        data: {
          expectedReturnDate: input.expectedReturnDate,
          status: allocation.status === 'OVERDUE' ? 'ACTIVE' : allocation.status,
          updatedBy: actor.id,
        },
        include: allocationRepository.detailInclude,
      });
      await tx.allocationHistory.create({
        data: {
          allocationId: id,
          action: 'EXTENDED',
          status: record.status,
          note: input.reason ?? `Extended to ${input.expectedReturnDate.toISOString()}`,
          performedBy: actor.id,
        },
      });
      await notify(
        {
          userId: allocation.employee.user?.email ? allocation.employeeId : allocation.employeeId,
          title: 'Return deadline extended',
          message: `Asset ${allocation.asset.assetTag} return extended to ${input.expectedReturnDate.toDateString()}`,
          type: 'ALLOCATION_EXTENDED',
          entityType: 'allocation',
          entityId: id,
        },
        tx,
      );
      return record;
    });

    broadcastActivity('allocation.extended', { allocationId: id });
    logger.info('allocation.extended', { id, actorId: actor.id });
    return updated;
  },

  /**
   * Flag allocations whose expected return date has passed. Idempotent —
   * only allocations still in ACTIVE state get bumped to OVERDUE and only
   * once (subsequent runs skip already-overdue rows). Emits notifications
   * to the current holder + manager and broadcasts a dashboard refresh.
   */
  async detectOverdue(): Promise<{ flagged: number }> {
    const candidates = await allocationRepository.findOverdueCandidates();
    if (candidates.length === 0) return { flagged: 0 };
    let flagged = 0;
    for (const c of candidates) {
      await prisma.$transaction(async (tx) => {
        const result = await tx.allocation.updateMany({
          where: { id: c.id, status: 'ACTIVE' },
          data: { status: 'OVERDUE', updatedAt: new Date() },
        });
        if (result.count === 0) return;
        flagged += 1;
        await tx.allocationHistory.create({
          data: {
            allocationId: c.id,
            action: 'OVERDUE_FLAGGED',
            status: 'OVERDUE',
            note: 'Auto-flagged as overdue by scheduler',
          },
        });
        await notify(
          {
            userId: c.employee.userId,
            title: 'Asset overdue',
            message: `Asset ${c.asset.assetTag} (${c.asset.name}) is overdue for return.`,
            priority: 'HIGH',
            type: 'ALLOCATION_OVERDUE',
            entityType: 'allocation',
            entityId: c.id,
          },
          tx,
        );
      });
    }
    if (flagged > 0) broadcastActivity('allocation.overdue.flagged', { count: flagged });
    return { flagged };
  },
};
