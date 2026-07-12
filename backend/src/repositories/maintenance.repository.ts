import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const listInclude = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.MaintenanceRequestInclude;

const detailInclude = {
  ...listInclude,
  assignments: { orderBy: { assignedAt: 'desc' as const } },
  history: { orderBy: { createdAt: 'desc' as const } },
  attachments: { where: { deletedAt: null } },
  resolution: true,
} satisfies Prisma.MaintenanceRequestInclude;

export interface MaintenanceFilters {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  priority?: string;
  assetId?: string;
  employeeId?: string;
}

function buildWhere(filters: MaintenanceFilters): Prisma.MaintenanceRequestWhereInput {
  const where: Prisma.MaintenanceRequestWhereInput = { deletedAt: null };
  if (filters.status)
    where.status = filters.status as Prisma.MaintenanceRequestWhereInput['status'];
  if (filters.priority)
    where.priority = filters.priority as Prisma.MaintenanceRequestWhereInput['priority'];
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  return where;
}

export const maintenanceRepository = {
  listInclude,
  detailInclude,

  findList(filters: MaintenanceFilters) {
    const where = buildWhere(filters);
    return Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        include: listInclude,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: filters.skip,
        take: filters.limit,
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.maintenanceRequest.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
  },
};
