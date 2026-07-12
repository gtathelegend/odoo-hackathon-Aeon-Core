import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const activeWhere: Prisma.AssetCategoryWhereInput = { deletedAt: null };

export const assetCategoryRepository = {
  findById(id: string) {
    return prisma.assetCategory.findFirst({
      where: { id, ...activeWhere },
      include: { fields: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
    });
  },

  findByCode(code: string) {
    return prisma.assetCategory.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, ...activeWhere },
    });
  },

  findAll(params: { search?: string; page: number; limit: number; skip: number }) {
    const where: Prisma.AssetCategoryWhereInput = {
      ...activeWhere,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.assetCategory.findMany({
        where,
        include: { _count: { select: { assets: true, fields: true } } },
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.assetCategory.count({ where }),
    ]);
  },

  create(data: Prisma.AssetCategoryUncheckedCreateInput) {
    return prisma.assetCategory.create({ data });
  },

  update(id: string, data: Prisma.AssetCategoryUncheckedUpdateInput) {
    return prisma.assetCategory.update({ where: { id }, data });
  },

  softDelete(id: string, actorId: string | null) {
    return prisma.assetCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actorId },
    });
  },

  countActiveAssets(categoryId: string) {
    return prisma.asset.count({
      where: { categoryId, deletedAt: null, status: { not: 'DISPOSED' } },
    });
  },
};
