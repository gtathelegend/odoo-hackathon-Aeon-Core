import { prisma } from '../config/database';
import { assetsRepository } from '../repositories/assets.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ASSET_ACTIONS } from '../constants/asset-lifecycle';
import type { CreateTransferInput, DecideTransferInput } from '../validators/asset';
import { logger } from '../config/logger';

interface Actor {
  id: string;
}

export const assetTransferService = {
  async list(assetId: string) {
    return prisma.transferRequest.findMany({
      where: { assetId, deletedAt: null },
      include: { approvals: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(assetId: string, input: CreateTransferInput, actor: Actor) {
    if (!input.toEmployeeId && !input.toDepartmentId) {
      throw new ValidationError('Provide either toEmployeeId or toDepartmentId');
    }

    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    // Resolve current holder from the active allocation, if any.
    const activeAllocation = asset.allocations[0];
    const fromEmployeeId = activeAllocation?.employeeId ?? null;

    if (input.toEmployeeId && fromEmployeeId === input.toEmployeeId) {
      throw new ValidationError('The recipient already holds this asset');
    }

    if (input.toEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { id: input.toEmployeeId, isActive: true, deletedAt: null },
      });
      if (!emp) throw new ValidationError('Recipient employee not found or inactive');
    }
    if (input.toDepartmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.toDepartmentId, isActive: true, deletedAt: null },
      });
      if (!dept) throw new ValidationError('Recipient department not found or inactive');
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.transferRequest.create({
        data: {
          assetId,
          fromEmployeeId,
          toEmployeeId: input.toEmployeeId ?? null,
          fromDepartmentId: asset.departmentId,
          toDepartmentId: input.toDepartmentId ?? null,
          requestedBy: actor.id,
          status: 'PENDING',
          reason: input.reason,
          notes: input.notes,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.TRANSFER_REQUESTED,
          note: input.reason,
          performedBy: actor.id,
        },
      });
      return created;
    });

    logger.info('asset.transfer.requested', {
      assetId,
      transferId: transfer.id,
      actorId: actor.id,
    });
    return transfer;
  },

  async decide(transferId: string, input: DecideTransferInput, actor: Actor) {
    const transfer = await prisma.transferRequest.findFirst({
      where: { id: transferId, deletedAt: null },
    });
    if (!transfer) throw new NotFoundError('Transfer request not found');
    if (transfer.status !== 'PENDING') {
      throw new ConflictError(`Transfer already ${transfer.status.toLowerCase()}`);
    }
    if (transfer.requestedBy && transfer.requestedBy === actor.id) {
      throw new ConflictError('You cannot approve a transfer you requested yourself');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.transferRequest.update({
        where: { id: transferId },
        data: { status: input.decision, updatedBy: actor.id },
      });
      await tx.transferApproval.create({
        data: {
          transferRequestId: transferId,
          approverId: actor.id,
          status: input.decision,
          comment: input.comment,
          decidedAt: new Date(),
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          action:
            input.decision === 'APPROVED'
              ? ASSET_ACTIONS.TRANSFER_APPROVED
              : ASSET_ACTIONS.TRANSFER_REJECTED,
          note: input.comment,
          performedBy: actor.id,
        },
      });

      logger.info('asset.transfer.decided', {
        transferId,
        decision: input.decision,
        actorId: actor.id,
      });
      return updated;
    });
  },
};
