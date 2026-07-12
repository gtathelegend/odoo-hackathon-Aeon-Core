import { assetCategoryRepository } from '../repositories/asset-category.repository';
import { buildPaginationMeta } from '../utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/asset';

interface Actor {
  id: string;
}

export const assetCategoryService = {
  async list(params: { page: number; limit: number; skip: number; search?: string }) {
    const [items, total] = await assetCategoryRepository.findAll(params);
    return {
      items,
      meta: buildPaginationMeta(total, params.page, params.limit),
    };
  },

  async getById(id: string) {
    const category = await assetCategoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  },

  async create(input: CreateCategoryInput, actor: Actor) {
    const existing = await assetCategoryRepository.findByCode(input.code);
    if (existing) throw new ConflictError('A category with this code already exists');
    if (input.parentId) {
      const parent = await assetCategoryRepository.findById(input.parentId);
      if (!parent) throw new ValidationError('Parent category not found');
    }
    return assetCategoryRepository.create({
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      parentId: input.parentId ?? null,
      maxAssets: input.maxAssets,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
  },

  async update(id: string, input: UpdateCategoryInput, actor: Actor) {
    const category = await assetCategoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    if (input.code && input.code.toUpperCase() !== category.code) {
      const clash = await assetCategoryRepository.findByCode(input.code);
      if (clash && clash.id !== id) throw new ConflictError('Category code already in use');
    }
    if (input.parentId) {
      if (input.parentId === id) throw new ValidationError('A category cannot be its own parent');
      const parent = await assetCategoryRepository.findById(input.parentId);
      if (!parent) throw new ValidationError('Parent category not found');
    }
    return assetCategoryRepository.update(id, {
      name: input.name,
      code: input.code?.toUpperCase(),
      description: input.description,
      parentId: input.parentId ?? undefined,
      maxAssets: input.maxAssets,
      updatedBy: actor.id,
    });
  },

  async remove(id: string, actor: Actor) {
    const category = await assetCategoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    const inUse = await assetCategoryRepository.countActiveAssets(id);
    if (inUse > 0) {
      throw new ConflictError(
        `Cannot delete category — ${inUse} active asset(s) reference it. Deactivate or reassign them first.`,
      );
    }
    return assetCategoryRepository.softDelete(id, actor.id);
  },
};
