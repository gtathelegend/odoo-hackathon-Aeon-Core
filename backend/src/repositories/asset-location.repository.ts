import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const activeWhere: Prisma.AssetLocationWhereInput = { deletedAt: null };

export const assetLocationRepository = {
  findById(id: string) {
    return prisma.assetLocation.findFirst({ where: { id, ...activeWhere } });
  },

  findByCode(code: string) {
    return prisma.assetLocation.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, ...activeWhere },
    });
  },

  findAll(params: { search?: string; page: number; limit: number; skip: number }) {
    const where: Prisma.AssetLocationWhereInput = {
      ...activeWhere,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
              { building: { contains: params.search, mode: 'insensitive' } },
              { room: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.assetLocation.findMany({
        where,
        include: { _count: { select: { assets: true } } },
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.assetLocation.count({ where }),
    ]);
  },

  create(data: Prisma.AssetLocationUncheckedCreateInput) {
    return prisma.assetLocation.create({ data });
  },

  update(id: string, data: Prisma.AssetLocationUncheckedUpdateInput) {
    return prisma.assetLocation.update({ where: { id }, data });
  },

  softDelete(id: string, actorId: string | null) {
    return prisma.assetLocation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actorId },
    });
  },

  countActiveAssets(locationId: string) {
    return prisma.asset.count({
      where: { locationId, deletedAt: null, status: { not: 'DISPOSED' } },
    });
  },
};
