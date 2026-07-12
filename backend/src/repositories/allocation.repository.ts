import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/** Full include for the allocation directory list rows. */
const listInclude = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.AllocationInclude;

const detailInclude = {
  ...listInclude,
  history: { orderBy: { createdAt: 'desc' as const } },
  returnRequests: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.AllocationInclude;

export interface AllocationFilters {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  employeeId?: string;
  assetId?: string;
  departmentId?: string;
  overdueOnly?: boolean;
  sortBy: 'allocationDate' | 'expectedReturnDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

function buildWhere(filters: AllocationFilters): Prisma.AllocationWhereInput {
  const where: Prisma.AllocationWhereInput = { deletedAt: null };
  if (filters.status) where.status = filters.status as Prisma.AllocationWhereInput['status'];
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.departmentId) {
    where.employee = { departmentId: filters.departmentId };
  }
  if (filters.overdueOnly) {
    where.status = { in: ['ACTIVE', 'OVERDUE'] };
    where.expectedReturnDate = { lt: new Date() };
  }
  return where;
}

export const allocationRepository = {
  listInclude,
  detailInclude,

  findList(filters: AllocationFilters) {
    const where = buildWhere(filters);
    return Promise.all([
      prisma.allocation.findMany({
        where,
        include: listInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: filters.skip,
        take: filters.limit,
      }),
      prisma.allocation.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.allocation.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
  },

  findOverdueCandidates() {
    return prisma.allocation.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        expectedReturnDate: { lt: new Date() },
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        employee: { select: { id: true, userId: true } },
      },
      take: 200,
    });
  },
};
