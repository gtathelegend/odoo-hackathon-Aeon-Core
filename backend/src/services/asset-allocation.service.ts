import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { assetsRepository } from '../repositories/assets.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ASSET_ACTIONS } from '../constants/asset-lifecycle';
import { ASSET_STATUS } from '../constants/status';
import type { AllocateInput, ReturnInput } from '../validators/asset';
import { logger } from '../config/logger';

interface Actor {
  id: string;
}

export const assetAllocationService = {
  /**
   * Allocate an AVAILABLE asset to an active employee. Uses a transaction +
   * version check to reject the losing side of concurrent allocations. When
   * the asset is not AVAILABLE the caller receives conflict details so the
   * frontend can offer a Transfer Request flow.
   */
  async allocate(assetId: string, input: AllocateInput, actor: Actor) {
    if (input.expectedReturnDate && input.expectedReturnDate.getTime() <= Date.now()) {
      throw new ValidationError('expectedReturnDate must be in the future');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, isActive: true, deletedAt: null },
      include: { user: { select: { isActive: true } } },
    });
    if (!employee) throw new ValidationError('Employee not found or inactive');
    if (!employee.user?.isActive) {
      throw new ValidationError('Cannot allocate to an inactive user account');
    }

    return prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id: assetId, deletedAt: null },
        include: {
          allocations: {
            where: { status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] } },
            include: {
              employee: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
          },
        },
      });
      if (!asset) throw new NotFoundError('Asset not found');

      if (asset.status !== ASSET_STATUS.AVAILABLE) {
        const currentHolder = asset.allocations[0]?.employee;
        throw new ConflictError('Asset is not available for allocation', {
          currentStatus: asset.status,
          currentHolder: currentHolder
            ? {
                employeeId: currentHolder.id,
                name: `${currentHolder.user?.firstName ?? ''} ${currentHolder.user?.lastName ?? ''}`.trim(),
                email: currentHolder.user?.email,
                since: asset.allocations[0]?.allocationDate,
              }
            : null,
          canRequestTransfer: currentHolder !== undefined,
        });
      }

      const update = await assetsRepository.updateWithVersion(tx, assetId, input.version, {
        status: ASSET_STATUS.ALLOCATED,
        updatedBy: actor.id,
      });
      if (update.count === 0) {
        throw new ConflictError('Asset state changed. Refresh and try again.');
      }

      const allocation = await tx.allocation.create({
        data: {
          assetId,
          employeeId: input.employeeId,
          allocatedBy: actor.id,
          status: 'ACTIVE',
          allocationDate: new Date(),
          expectedReturnDate: input.expectedReturnDate,
          allocationCondition: (input.allocationCondition ??
            'GOOD') as Prisma.AllocationCreateInput['allocationCondition'],
          notes: input.notes,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        include: {
          employee: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      });

      await tx.allocationHistory.create({
        data: {
          allocationId: allocation.id,
          action: ASSET_ACTIONS.ALLOCATED,
          status: 'ACTIVE',
          performedBy: actor.id,
        },
      });
      await tx.assetStatusHistory.create({
        data: {
          assetId,
          fromStatus: ASSET_STATUS.AVAILABLE,
          toStatus: ASSET_STATUS.ALLOCATED,
          reason: 'allocation created',
          changedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.ALLOCATED,
          note: `Allocated to employee ${input.employeeId}`,
          performedBy: actor.id,
        },
      });

      logger.info('asset.allocated', { assetId, employeeId: input.employeeId, actorId: actor.id });
      return allocation;
    });
  },

  /**
   * Close the current allocation and return the asset to AVAILABLE. Refuses
   * when there is no active allocation. Version check protects against
   * concurrent state changes.
   */
  async processReturn(assetId: string, input: ReturnInput, actor: Actor) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id: assetId, deletedAt: null },
        select: { id: true, status: true, version: true },
      });
      if (!asset) throw new NotFoundError('Asset not found');
      if (asset.status !== ASSET_STATUS.ALLOCATED) {
        throw new ConflictError('Asset is not currently allocated');
      }

      const activeAllocation = await tx.allocation.findFirst({
        where: {
          assetId,
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
        orderBy: { allocationDate: 'desc' },
      });
      if (!activeAllocation) {
        throw new ConflictError('No active allocation to close');
      }

      const update = await assetsRepository.updateWithVersion(tx, assetId, input.version, {
        status: ASSET_STATUS.AVAILABLE,
        condition: input.returnCondition as Prisma.AssetUncheckedUpdateInput['condition'],
        updatedBy: actor.id,
      });
      if (update.count === 0) {
        throw new ConflictError('Asset state changed. Refresh and try again.');
      }

      await tx.allocation.update({
        where: { id: activeAllocation.id },
        data: {
          status: 'RETURNED',
          actualReturnDate: new Date(),
          returnCondition:
            input.returnCondition as Prisma.AllocationUncheckedUpdateInput['returnCondition'],
          notes: input.notes,
          updatedBy: actor.id,
        },
      });
      await tx.allocationHistory.create({
        data: {
          allocationId: activeAllocation.id,
          action: ASSET_ACTIONS.RETURNED,
          status: 'RETURNED',
          note: input.notes,
          performedBy: actor.id,
        },
      });
      await tx.assetStatusHistory.create({
        data: {
          assetId,
          fromStatus: ASSET_STATUS.ALLOCATED,
          toStatus: ASSET_STATUS.AVAILABLE,
          reason: 'asset returned',
          changedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.RETURNED,
          note: `Returned in condition ${input.returnCondition}`,
          performedBy: actor.id,
        },
      });

      logger.info('asset.returned', { assetId, actorId: actor.id });

      return {
        allocationId: activeAllocation.id,
        returnedAt: new Date(),
        condition: input.returnCondition,
      };
    });
  },
};
