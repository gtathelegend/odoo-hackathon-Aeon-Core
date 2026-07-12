import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { assetsRepository } from '../repositories/assets.repository';
import { assetCategoryRepository } from '../repositories/asset-category.repository';
import { assetLocationRepository } from '../repositories/asset-location.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { nextAssetTag } from '../utils/asset-tag';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import type {
  AssetListQuery,
  CreateAssetInput,
  UpdateAssetInput,
  TransitionInput,
} from '../validators/asset';
import { ASSET_ACTIONS, canTransition } from '../constants/asset-lifecycle';
import { ASSET_STATUS, type AssetStatus } from '../constants/status';
import { ROLES, type Role } from '../constants/roles';
import { logger } from '../config/logger';

interface Actor {
  id: string;
  role: Role;
  departmentId?: string | null;
}

/**
 * Compute a per-role scope filter. Department Heads only see assets in their
 * own department (or currently allocated to someone in it via the department
 * scope on the Asset itself). Employees see nothing sensitive by default —
 * feature APIs above this service decide whether to expose employee views.
 */
function scopeFilter(actor: Actor): Prisma.AssetWhereInput | null {
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER) return null;
  if (actor.role === ROLES.DEPARTMENT_HEAD) {
    if (!actor.departmentId) return { id: '00000000-0000-0000-0000-000000000000' }; // deny all
    return { departmentId: actor.departmentId };
  }
  // Employee — same restriction as department head fall-through.
  if (!actor.departmentId) return { id: '00000000-0000-0000-0000-000000000000' };
  return { departmentId: actor.departmentId };
}

export const assetsService = {
  async list(query: AssetListQuery, actor: Actor) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filters = {
      page,
      limit,
      skip,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      search: query.search,
      status: query.status,
      condition: query.condition,
      categoryId: query.categoryId,
      locationId: query.locationId,
      departmentId: query.departmentId,
    };

    const scope = scopeFilter(actor);
    if (scope?.departmentId && !filters.departmentId) {
      filters.departmentId = scope.departmentId as string;
    }

    const [items, total] = await assetsRepository.findList(filters);
    return {
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getById(id: string, actor: Actor) {
    const asset = await assetsRepository.findById(id);
    if (!asset) throw new NotFoundError('Asset not found');

    const scope = scopeFilter(actor);
    if (scope?.departmentId && asset.departmentId !== scope.departmentId) {
      throw new NotFoundError('Asset not found');
    }

    const [history, statusHistory, allocations, maintenance, bookings] = await Promise.all([
      assetsRepository.findHistory(id),
      assetsRepository.findStatusHistory(id),
      assetsRepository.findAllocations(id),
      assetsRepository.findMaintenance(id),
      assetsRepository.findBookings(id),
    ]);

    return { asset, history, statusHistory, allocations, maintenance, bookings };
  },

  async create(input: CreateAssetInput, actor: Actor) {
    if (input.serialNumber) {
      const clash = await assetsRepository.findBySerialNumber(input.serialNumber);
      if (clash) throw new ConflictError('An asset with this serial number already exists');
    }
    const category = await assetCategoryRepository.findById(input.categoryId);
    if (!category) throw new ValidationError('Category not found');
    if (input.locationId) {
      const location = await assetLocationRepository.findById(input.locationId);
      if (!location) throw new ValidationError('Location not found');
    }

    return prisma.$transaction(async (tx) => {
      const assetTag = await nextAssetTag(tx);
      const asset = await tx.asset.create({
        data: {
          assetTag,
          serialNumber: input.serialNumber,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          locationId: input.locationId ?? null,
          departmentId: input.departmentId ?? null,
          status: ASSET_STATUS.AVAILABLE,
          condition: (input.condition ?? 'GOOD') as Prisma.AssetCreateInput['condition'],
          purchaseCost: input.purchaseCost as unknown as Prisma.Decimal | undefined,
          currentValue: input.currentValue as unknown as Prisma.Decimal | undefined,
          purchaseDate: input.purchaseDate,
          warrantyExpiry: input.warrantyExpiry,
          vendor: input.vendor,
          manufacturer: input.manufacturer,
          model: input.model,
          customFields: input.customFields as Prisma.InputJsonValue | undefined,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        include: assetsRepository.passportInclude,
      });

      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: ASSET_ACTIONS.CREATED,
          note: 'Asset registered',
          changes: input as unknown as Prisma.InputJsonValue,
          performedBy: actor.id,
        },
      });

      await tx.assetStatusHistory.create({
        data: {
          assetId: asset.id,
          fromStatus: null,
          toStatus: ASSET_STATUS.AVAILABLE,
          reason: 'initial registration',
          changedBy: actor.id,
        },
      });

      return asset;
    });
  },

  async update(id: string, input: UpdateAssetInput, actor: Actor) {
    const existing = await assetsRepository.findById(id);
    if (!existing) throw new NotFoundError('Asset not found');

    // Business-rule validation.
    if (input.serialNumber && input.serialNumber !== existing.serialNumber) {
      const clash = await assetsRepository.findBySerialNumber(input.serialNumber);
      if (clash && clash.id !== id) {
        throw new ConflictError('Serial number already in use by another asset');
      }
    }
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await assetCategoryRepository.findById(input.categoryId);
      if (!category) throw new ValidationError('Category not found');
    }
    if (input.locationId && input.locationId !== existing.locationId) {
      const location = await assetLocationRepository.findById(input.locationId);
      if (!location) throw new ValidationError('Location not found');
    }

    const { version, ...rest } = input;
    const data: Prisma.AssetUncheckedUpdateInput = {
      ...rest,
      purchaseCost: rest.purchaseCost as unknown as Prisma.Decimal | undefined,
      currentValue: rest.currentValue as unknown as Prisma.Decimal | undefined,
      customFields: rest.customFields as Prisma.InputJsonValue | undefined,
      updatedBy: actor.id,
    };

    return prisma.$transaction(async (tx) => {
      const result = await assetsRepository.updateWithVersion(tx, id, version, data);
      if (result.count === 0) {
        throw new ConflictError(
          'This asset was modified by someone else. Please refresh and try again.',
        );
      }
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: ASSET_ACTIONS.UPDATED,
          changes: rest as unknown as Prisma.InputJsonValue,
          performedBy: actor.id,
        },
      });
      const fresh = await tx.asset.findFirst({
        where: { id, deletedAt: null },
        include: assetsRepository.passportInclude,
      });
      if (!fresh) throw new NotFoundError('Asset not found after update');
      return fresh;
    });
  },

  async transition(id: string, input: TransitionInput, actor: Actor) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, status: true, version: true, assetTag: true },
      });
      if (!asset) throw new NotFoundError('Asset not found');

      const from = asset.status as AssetStatus;
      const to = input.toStatus;

      if (!canTransition(from, to)) {
        throw new ConflictError(
          `Invalid transition from ${from} to ${to}. Asset ${asset.assetTag} cannot make this move.`,
        );
      }

      const result = await assetsRepository.updateWithVersion(tx, id, input.version, {
        status: to,
        updatedBy: actor.id,
      });
      if (result.count === 0) {
        throw new ConflictError(
          'Asset state changed while you were viewing it. Refresh and try again.',
        );
      }

      await tx.assetStatusHistory.create({
        data: {
          assetId: id,
          fromStatus: from,
          toStatus: to,
          reason: input.reason,
          changedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: `TRANSITION_${to}`,
          note: input.reason,
          performedBy: actor.id,
        },
      });

      logger.info('asset.transition', {
        assetId: id,
        from,
        to,
        actorId: actor.id,
      });

      const fresh = await tx.asset.findFirst({
        where: { id },
        include: assetsRepository.passportInclude,
      });
      return fresh!;
    });
  },

  /**
   * Soft delete. Explicitly refuses to hard-delete — the state machine forces
   * asset managers down the retire → dispose path instead. This method is
   * intentionally not exposed on the router; it exists so admin tooling can
   * archive orphaned records after DISPOSAL.
   */
  async archive(id: string, actor: Actor) {
    const asset = await assetsRepository.findById(id);
    if (!asset) throw new NotFoundError('Asset not found');
    if (asset.status !== ASSET_STATUS.DISPOSED) {
      throw new ConflictError('Only DISPOSED assets can be archived. Retire and dispose first.');
    }
    return prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actor.id },
    });
  },
};
