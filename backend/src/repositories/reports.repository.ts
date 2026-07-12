import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Reports repository — saved report configurations, export tracking, and
 * the underlying dataset queries powering each report type. Report result
 * shaping (columns / labels / totals) belongs in the service; this layer
 * only returns the raw rows.
 */

const savedReportSelect = {
  id: true,
  name: true,
  ownerId: true,
  type: true,
  config: true,
  isShared: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SavedReportSelect;

export interface SavedReportListFilters {
  skip: number;
  take: number;
  ownerId?: string;
  type?: string;
  isShared?: boolean;
  search?: string;
}

function buildSavedWhere(filters: SavedReportListFilters): Prisma.SavedReportWhereInput {
  const where: Prisma.SavedReportWhereInput = { deletedAt: null };
  if (filters.type) where.type = filters.type;
  if (filters.isShared !== undefined) where.isShared = filters.isShared;
  if (filters.ownerId) {
    where.OR = [{ ownerId: filters.ownerId }, { isShared: true }];
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }
  return where;
}

export const reportsRepository = {
  // --------------------------------------------------------- Saved CRUD ---

  listSaved(filters: SavedReportListFilters) {
    const where = buildSavedWhere(filters);
    return Promise.all([
      prisma.savedReport.findMany({
        where,
        select: savedReportSelect,
        orderBy: { updatedAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.savedReport.count({ where }),
    ]);
  },

  findSavedById(id: string) {
    return prisma.savedReport.findFirst({
      where: { id, deletedAt: null },
      select: savedReportSelect,
    });
  },

  createSaved(data: Prisma.SavedReportUncheckedCreateInput) {
    return prisma.savedReport.create({ data, select: savedReportSelect });
  },

  updateSaved(id: string, data: Prisma.SavedReportUncheckedUpdateInput) {
    return prisma.savedReport.update({ where: { id }, data, select: savedReportSelect });
  },

  softDeleteSaved(id: string, actorId?: string) {
    return prisma.savedReport.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: actorId,
      },
      select: savedReportSelect,
    });
  },

  // --------------------------------------------------------- Exports ------

  createExport(data: Prisma.ReportExportUncheckedCreateInput) {
    return prisma.reportExport.create({ data });
  },

  updateExport(id: string, data: Prisma.ReportExportUncheckedUpdateInput) {
    return prisma.reportExport.update({ where: { id }, data });
  },

  listExports(params: { skip: number; take: number; savedReportId?: string; status?: string }) {
    const where: Prisma.ReportExportWhereInput = { deletedAt: null };
    if (params.savedReportId) where.savedReportId = params.savedReportId;
    if (params.status) where.status = params.status;
    return Promise.all([
      prisma.reportExport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.reportExport.count({ where }),
    ]);
  },

  findPendingExports(limit: number) {
    return prisma.reportExport.findMany({
      where: { deletedAt: null, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  // -------------------------------------------------------- Datasets ------

  /** Assets dataset with common filters. Rows are returned rich enough to
   *  populate the standard columns without a follow-up join. */
  assetsDataset(filters: {
    status?: string;
    categoryId?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: Prisma.AssetWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.AssetWhereInput['status'];
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.createdAt as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 5000,
      include: {
        category: { select: { name: true, code: true } },
        location: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
    });
  },

  allocationsDataset(filters: {
    status?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: Prisma.AllocationWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.AllocationWhereInput['status'];
    if (filters.departmentId) where.employee = { departmentId: filters.departmentId };
    if (filters.from || filters.to) {
      where.allocationDate = {};
      if (filters.from) (where.allocationDate as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.allocationDate as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.allocation.findMany({
      where,
      orderBy: { allocationDate: 'desc' },
      take: filters.limit ?? 5000,
      include: {
        asset: { select: { assetTag: true, name: true, status: true } },
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        },
      },
    });
  },

  maintenanceDataset(filters: {
    status?: string;
    priority?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: Prisma.MaintenanceRequestWhereInput = { deletedAt: null };
    if (filters.status)
      where.status = filters.status as Prisma.MaintenanceRequestWhereInput['status'];
    if (filters.priority)
      where.priority = filters.priority as Prisma.MaintenanceRequestWhereInput['priority'];
    if (filters.departmentId) where.asset = { departmentId: filters.departmentId };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.createdAt as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 5000,
      include: {
        asset: { select: { assetTag: true, name: true } },
        resolution: { select: { cost: true, resolvedAt: true } },
      },
    });
  },

  bookingsDataset(filters: {
    status?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: Prisma.BookingWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.BookingWhereInput['status'];
    if (filters.departmentId) where.asset = { departmentId: filters.departmentId };
    if (filters.from || filters.to) {
      where.startTime = {};
      if (filters.from) (where.startTime as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.startTime as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: filters.limit ?? 5000,
      include: {
        asset: { select: { assetTag: true, name: true } },
        sharedResource: { select: { name: true, code: true } },
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  },

  auditsDataset(filters: { status?: string; from?: Date; to?: Date; limit?: number }) {
    const where: Prisma.AuditCycleWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.AuditCycleWhereInput['status'];
    if (filters.from || filters.to) {
      where.startDate = {};
      if (filters.from) (where.startDate as Prisma.DateTimeFilter).gte = filters.from;
      if (filters.to) (where.startDate as Prisma.DateTimeFilter).lte = filters.to;
    }
    return prisma.auditCycle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 500,
      include: {
        _count: { select: { records: true } },
      },
    });
  },
};
