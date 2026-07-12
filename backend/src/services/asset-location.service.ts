import { assetLocationRepository } from '../repositories/asset-location.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import type { CreateLocationInput, UpdateLocationInput } from '../validators/asset';

interface Actor {
  id: string;
}

export const assetLocationService = {
  async list(params: { page: number; limit: number; skip: number; search?: string }) {
    const [items, total] = await assetLocationRepository.findAll(params);
    return {
      items,
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  },

  async getById(id: string) {
    const location = await assetLocationRepository.findById(id);
    if (!location) throw new NotFoundError('Location not found');
    return location;
  },

  async create(input: CreateLocationInput, actor: Actor) {
    const existing = await assetLocationRepository.findByCode(input.code);
    if (existing) throw new ConflictError('A location with this code already exists');
    if (input.parentId) {
      const parent = await assetLocationRepository.findById(input.parentId);
      if (!parent) throw new ValidationError('Parent location not found');
    }
    return assetLocationRepository.create({
      name: input.name,
      code: input.code.toUpperCase(),
      building: input.building,
      floor: input.floor,
      room: input.room,
      parentId: input.parentId ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
  },

  async update(id: string, input: UpdateLocationInput, actor: Actor) {
    const location = await assetLocationRepository.findById(id);
    if (!location) throw new NotFoundError('Location not found');
    if (input.code && input.code.toUpperCase() !== location.code) {
      const clash = await assetLocationRepository.findByCode(input.code);
      if (clash && clash.id !== id) throw new ConflictError('Location code already in use');
    }
    if (input.parentId) {
      if (input.parentId === id) throw new ValidationError('A location cannot be its own parent');
      const parent = await assetLocationRepository.findById(input.parentId);
      if (!parent) throw new ValidationError('Parent location not found');
    }
    return assetLocationRepository.update(id, {
      name: input.name,
      code: input.code?.toUpperCase(),
      building: input.building,
      floor: input.floor,
      room: input.room,
      parentId: input.parentId ?? undefined,
      updatedBy: actor.id,
    });
  },

  async remove(id: string, actor: Actor) {
    const location = await assetLocationRepository.findById(id);
    if (!location) throw new NotFoundError('Location not found');
    const inUse = await assetLocationRepository.countActiveAssets(id);
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete location — ${inUse} active asset(s) reference it.`);
    }
    return assetLocationRepository.softDelete(id, actor.id);
  },
};
