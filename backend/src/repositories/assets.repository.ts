import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import type { AssetStatus } from '../constants/status';

/** Non-deleted asset scope shared by every query. */
const activeWhere: Prisma.AssetWhereInput = { deletedAt: null };

/** Rich include used by the directory + passport views. */
const passportInclude = {
  category: true,
  location: true,
  department: true,
  qrCode: true,
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
  },
  allocations: {
    where: { status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] as const } },
    orderBy: { allocationDate: 'desc' as const },
    take: 1,
    include: {
      employee: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  },
} satisfies Prisma.AssetInclude;

/** Lighter include for list rows to keep the payload small. */
const listInclude = {
  category: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  qrCode: { select: { id: true, imageUrl: true } },
  allocations: {
    where: { status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] as const } },
    orderBy: { allocationDate: 'desc' as const },
    take: 1,
    select: {
      id: true,
      status: true,
      expectedReturnDate: true,
      employee: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
} satisfies Prisma.AssetInclude;

export interface AssetListFilters {
  page: number;
  limit: number;
  skip: number;
  sortBy: 'createdAt' | 'updatedAt' | 'name' | 'assetTag' | 'status';
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: AssetStatus;
  condition?: string;
  categoryId?: string;
  locationId?: string;
  departmentId?: string;
}

function buildWhere(filters: AssetListFilters): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = { ...activeWhere };
  if (filters.status) where.status = filters.status;
  if (filters.condition) where.condition = filters.condition as Prisma.AssetWhereInput['condition'];
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.departmentId) where.departmentId = filters.departmentId;

  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { assetTag: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { serialNumber: { contains: q, mode: 'insensitive' } },
      { manufacturer: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
      { category: { code: { contains: q, mode: 'insensitive' } } },
      { location: { name: { contains: q, mode: 'insensitive' } } },
      { location: { code: { contains: q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export type PassportAsset = Prisma.AssetGetPayload<{ include: typeof passportInclude }>;
export type ListAsset = Prisma.AssetGetPayload<{ include: typeof listInclude }>;

export const assetsRepository = {
  passportInclude,
  listInclude,

  findList(filters: AssetListFilters) {
    const where = buildWhere(filters);
    return Promise.all([
      prisma.asset.findMany({
        where,
        include: listInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: filters.skip,
        take: filters.limit,
      }),
      prisma.asset.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.asset.findFirst({ where: { id, ...activeWhere }, include: passportInclude });
  },

  findByTag(tag: string) {
    return prisma.asset.findFirst({
      where: { assetTag: tag, ...activeWhere },
      include: passportInclude,
    });
  },

  findBySerialNumber(serial: string) {
    return prisma.asset.findFirst({
      where: { serialNumber: serial, ...activeWhere },
    });
  },

  findHistory(id: string) {
    return prisma.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  },

  findStatusHistory(id: string) {
    return prisma.assetStatusHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  },

  findAllocations(id: string) {
    return prisma.allocation.findMany({
      where: { assetId: id, deletedAt: null },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { allocationDate: 'desc' },
      take: 50,
    });
  },

  findMaintenance(id: string) {
    return prisma.maintenanceRequest.findMany({
      where: { assetId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  findBookings(id: string) {
    return prisma.booking.findMany({
      where: { assetId: id, deletedAt: null },
      orderBy: { startTime: 'desc' },
      take: 50,
    });
  },

  countByStatus() {
    return prisma.asset.groupBy({
      by: ['status'],
      where: activeWhere,
      _count: { _all: true },
    });
  },

  countByCondition() {
    return prisma.asset.groupBy({
      by: ['condition'],
      where: activeWhere,
      _count: { _all: true },
    });
  },

  countByCategory() {
    return prisma.asset.groupBy({
      by: ['categoryId'],
      where: activeWhere,
      _count: { _all: true },
    });
  },

  countTotalActive() {
    return prisma.asset.count({ where: activeWhere });
  },

  countOverdueAllocations() {
    return prisma.allocation.count({
      where: {
        status: { in: ['ACTIVE', 'OVERDUE'] },
        expectedReturnDate: { lt: new Date() },
      },
    });
  },

  /**
   * Optimistic-locking update. Rejects with `count === 0` when the version
   * has changed since the caller read it — the caller must translate this
   * into a `ConflictError`.
   */
  updateWithVersion(
    client: PrismaClient | Prisma.TransactionClient,
    id: string,
    version: number,
    data: Prisma.AssetUncheckedUpdateInput,
  ) {
    return client.asset.updateMany({
      where: { id, version, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
  },
};
