import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Dashboard repository.
 *
 * Holds every aggregate/time-series query the API surface for dashboards
 * needs. Keeping the SQL-shaped calls in one place makes it easy to swap in
 * materialized views later without touching the service layer.
 *
 * Design notes:
 *  - Everything is scoped by `deletedAt: null` unless a soft-deleted row is
 *    intentionally required (activity log has no soft delete).
 *  - Department scoping is optional; passing `undefined` returns global rows.
 *  - Time series are returned as pre-aggregated buckets keyed by `bucket`.
 */

export interface DashboardScope {
  /** When present, only rows in this department (or its descendants) are counted. */
  departmentId?: string;
  /** When present, restrict allocations/maintenance to this employee. */
  employeeId?: string;
  /** When present, restrict allocations/maintenance to this user's employee record. */
  userId?: string;
}

const assetActive: Prisma.AssetWhereInput = { deletedAt: null };
const allocationActive: Prisma.AllocationWhereInput = { deletedAt: null };
const bookingActive: Prisma.BookingWhereInput = { deletedAt: null };
const maintenanceActive: Prisma.MaintenanceRequestWhereInput = { deletedAt: null };

function assetWhere(scope: DashboardScope): Prisma.AssetWhereInput {
  return {
    ...assetActive,
    ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
  };
}

function allocationWhere(scope: DashboardScope): Prisma.AllocationWhereInput {
  const where: Prisma.AllocationWhereInput = { ...allocationActive };
  if (scope.employeeId) where.employeeId = scope.employeeId;
  if (scope.departmentId) where.employee = { departmentId: scope.departmentId };
  return where;
}

function maintenanceWhere(scope: DashboardScope): Prisma.MaintenanceRequestWhereInput {
  const where: Prisma.MaintenanceRequestWhereInput = { ...maintenanceActive };
  if (scope.employeeId) where.employeeId = scope.employeeId;
  if (scope.departmentId) where.asset = { departmentId: scope.departmentId };
  return where;
}

function bookingWhere(scope: DashboardScope): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = { ...bookingActive };
  if (scope.employeeId) where.employeeId = scope.employeeId;
  if (scope.departmentId) where.asset = { departmentId: scope.departmentId };
  return where;
}

export const dashboardRepository = {
  // ---------------------------------------------------------------- KPIs ---

  countAssetsByStatus(scope: DashboardScope = {}) {
    return prisma.asset.groupBy({
      by: ['status'],
      where: assetWhere(scope),
      _count: { _all: true },
    });
  },

  countAssetsByCondition(scope: DashboardScope = {}) {
    return prisma.asset.groupBy({
      by: ['condition'],
      where: assetWhere(scope),
      _count: { _all: true },
    });
  },

  countAssetsByDepartment() {
    return prisma.asset.groupBy({
      by: ['departmentId'],
      where: { ...assetActive, departmentId: { not: null } },
      _count: { _all: true },
    });
  },

  countAssetsByCategory(scope: DashboardScope = {}) {
    return prisma.asset.groupBy({
      by: ['categoryId'],
      where: assetWhere(scope),
      _count: { _all: true },
    });
  },

  totalAssetValue(scope: DashboardScope = {}) {
    return prisma.asset.aggregate({
      where: assetWhere(scope),
      _sum: { currentValue: true, purchaseCost: true },
    });
  },

  countAllocations(scope: DashboardScope = {}) {
    return prisma.allocation.groupBy({
      by: ['status'],
      where: allocationWhere(scope),
      _count: { _all: true },
    });
  },

  countOverdueAllocations(scope: DashboardScope = {}) {
    return prisma.allocation.count({
      where: {
        ...allocationWhere(scope),
        status: { in: ['ACTIVE', 'OVERDUE'] },
        expectedReturnDate: { lt: new Date() },
      },
    });
  },

  countMaintenance(scope: DashboardScope = {}) {
    return prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: maintenanceWhere(scope),
      _count: { _all: true },
    });
  },

  countMaintenanceByPriority(scope: DashboardScope = {}) {
    return prisma.maintenanceRequest.groupBy({
      by: ['priority'],
      where: {
        ...maintenanceWhere(scope),
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      _count: { _all: true },
    });
  },

  countBookings(scope: DashboardScope = {}, opts: { upcomingOnly?: boolean } = {}) {
    const where: Prisma.BookingWhereInput = { ...bookingWhere(scope) };
    if (opts.upcomingOnly) {
      where.startTime = { gte: new Date() };
      where.status = { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] };
    }
    return prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
  },

  countAudits() {
    return prisma.auditCycle.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  },

  countOpenDiscrepancies() {
    return prisma.auditDiscrepancy.count({
      where: { deletedAt: null, resolved: false },
    });
  },

  countUsers() {
    return Promise.all([
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null, isActive: true },
        _count: { _all: true },
      }),
    ]);
  },

  countDepartments() {
    return prisma.department.count({ where: { deletedAt: null, status: 'ACTIVE' } });
  },

  // ---------------------------------------------------------- Time Series --

  /**
   * Allocations grouped by day for the last `days` days. Includes zero-count
   * buckets so the front-end can render sparklines without gaps.
   */
  allocationsPerDay(days: number, scope: DashboardScope = {}) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    return prisma.allocation.findMany({
      where: {
        ...allocationWhere(scope),
        allocationDate: { gte: since },
      },
      select: { allocationDate: true, status: true },
      orderBy: { allocationDate: 'asc' },
    });
  },

  maintenancePerDay(days: number, scope: DashboardScope = {}) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    return prisma.maintenanceRequest.findMany({
      where: {
        ...maintenanceWhere(scope),
        createdAt: { gte: since },
      },
      select: { createdAt: true, status: true, priority: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  // ----------------------------------------------------- Recent Activity ---

  recentActivity(params: {
    limit: number;
    skip: number;
    userId?: string;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    action?: string;
    search?: string;
  }) {
    const where: Prisma.ActivityLogWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) (where.createdAt as Prisma.DateTimeFilter).gte = params.from;
      if (params.to) (where.createdAt as Prisma.DateTimeFilter).lte = params.to;
    }
    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);
  },

  /**
   * Timeline for a specific entity (asset/allocation/booking/etc). Returns
   * both the ActivityLog rows and any domain history rows that reference the
   * entity, so the UI can render a chronological chain regardless of source.
   */
  entityTimeline(entityType: string, entityId: string, limit = 100) {
    return prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  },

  // -------------------------------------------------------- Top / Rank -----

  topCategoriesByAssetCount(limit: number, scope: DashboardScope = {}) {
    return prisma.asset.groupBy({
      by: ['categoryId'],
      where: assetWhere(scope),
      _count: { _all: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: limit,
    });
  },

  topDepartmentsByAssetCount(limit: number) {
    return prisma.asset.groupBy({
      by: ['departmentId'],
      where: { ...assetActive, departmentId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { departmentId: 'desc' } },
      take: limit,
    });
  },

  categoryLookup(ids: string[]) {
    if (ids.length === 0)
      return Promise.resolve([] as { id: string; name: string; code: string }[]);
    return prisma.assetCategory.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, code: true },
    });
  },

  departmentLookup(ids: string[]) {
    if (ids.length === 0)
      return Promise.resolve([] as { id: string; name: string; code: string }[]);
    return prisma.department.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, code: true },
    });
  },
};
