import { prisma } from '../config/database';
import { dashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardScope } from '../repositories/dashboard.repository';
import { ROLES, type Role } from '../constants/roles';
import { AuthorizationError } from '../utils/errors';
import type { DashboardQuery, TimeseriesQuery } from '../validators/dashboard';
import type { RequestUser } from '../interfaces/request-user.interface';

/**
 * Dashboard service — assembles role-specific KPI/chart/activity payloads.
 *
 * Rules of the road:
 *  - ADMIN & ASSET_MANAGER see everything. They can further scope by
 *    departmentId via the query.
 *  - DEPARTMENT_HEAD is auto-scoped to their department (derived from their
 *    Employee record). They cannot escape scope by passing another id.
 *  - EMPLOYEE sees only their personal metrics (allocations, bookings,
 *    maintenance requests they raised).
 *
 * Every dashboard call is stateless — repeat requests always reflect the
 * latest DB state, so live updates fire from the emit layer and clients can
 * simply re-fetch after a `dashboard.refresh` event.
 */

interface ResolvedActor {
  user: RequestUser;
  role: Role;
  employeeId?: string;
  departmentId?: string;
}

async function resolveActor(user: RequestUser): Promise<ResolvedActor> {
  if (user.role === ROLES.ADMIN || user.role === ROLES.ASSET_MANAGER) {
    return { user, role: user.role };
  }
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, departmentId: true },
  });
  return {
    user,
    role: user.role,
    employeeId: employee?.id,
    departmentId: employee?.departmentId ?? undefined,
  };
}

function scopeFor(actor: ResolvedActor, override?: string): DashboardScope {
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER) {
    return override ? { departmentId: override } : {};
  }
  if (actor.role === ROLES.DEPARTMENT_HEAD) {
    if (!actor.departmentId)
      throw new AuthorizationError('Department head is not assigned to a department');
    return { departmentId: actor.departmentId };
  }
  // EMPLOYEE — self only.
  if (!actor.employeeId) throw new AuthorizationError('Employee record not found');
  return { employeeId: actor.employeeId, userId: actor.user.id };
}

/** Fold raw groupBy rows into a status→count map keyed by every enum value. */
function foldStatusCounts<T extends string>(
  rows: Array<{ _count: { _all: number } } & Record<string, unknown>>,
  key: string,
  keys: readonly T[],
): Record<T, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const r of rows) {
    const v = r[key] as T | null;
    if (v && v in out) out[v] = r._count._all;
  }
  return out;
}

const ASSET_STATUS_KEYS = [
  'AVAILABLE',
  'ALLOCATED',
  'RESERVED',
  'MAINTENANCE',
  'LOST',
  'RETIRED',
  'DISPOSED',
] as const;
const ALLOCATION_STATUS_KEYS = ['PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED'] as const;
const MAINTENANCE_STATUS_KEYS = [
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'CANCELLED',
] as const;
const BOOKING_STATUS_KEYS = [
  'PENDING',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

/** Build a day-by-day series for a set of timestamped events. */
function bucketByDay<T extends { [k in K]: Date }, K extends string>(
  rows: T[],
  key: K,
  windowDays: number,
): { date: string; count: number }[] {
  const buckets: Record<string, number> = {};
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of rows) {
    const iso = (r[key] as Date).toISOString().slice(0, 10);
    if (iso in buckets) buckets[iso]! += 1;
  }
  return Object.entries(buckets)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const dashboardService = {
  /**
   * Assemble the primary dashboard payload for a user. Combines KPIs, charts
   * (status distribution + time series) and a recent activity slice into a
   * single response so the front-end can render the shell with one call.
   */
  async overview(user: RequestUser, query: DashboardQuery) {
    const actor = await resolveActor(user);
    const scope = scopeFor(actor, query.departmentId);
    const windowDays = query.windowDays ?? 14;
    const activityLimit = query.activityLimit ?? 10;

    const [
      assetsByStatus,
      assetsByCondition,
      assetsByCategoryRaw,
      totalAssetValue,
      allocationsByStatus,
      overdueAllocations,
      maintenanceByStatus,
      maintenanceByPriority,
      bookingsByStatus,
      upcomingBookings,
      auditByStatus,
      openDiscrepancies,
      allocationsRaw,
      maintenanceRaw,
      recentActivity,
      admin,
    ] = await Promise.all([
      dashboardRepository.countAssetsByStatus(scope),
      dashboardRepository.countAssetsByCondition(scope),
      dashboardRepository.topCategoriesByAssetCount(6, scope),
      dashboardRepository.totalAssetValue(scope),
      dashboardRepository.countAllocations(scope),
      dashboardRepository.countOverdueAllocations(scope),
      dashboardRepository.countMaintenance(scope),
      dashboardRepository.countMaintenanceByPriority(scope),
      dashboardRepository.countBookings(scope),
      dashboardRepository.countBookings(scope, { upcomingOnly: true }),
      actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER
        ? dashboardRepository.countAudits()
        : Promise.resolve([]),
      actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER
        ? dashboardRepository.countOpenDiscrepancies()
        : Promise.resolve(0),
      dashboardRepository.allocationsPerDay(windowDays, scope),
      dashboardRepository.maintenancePerDay(windowDays, scope),
      dashboardRepository.recentActivity({
        skip: 0,
        limit: activityLimit,
        userId: actor.role === ROLES.EMPLOYEE ? actor.user.id : undefined,
      }),
      actor.role === ROLES.ADMIN
        ? Promise.all([dashboardRepository.countUsers(), dashboardRepository.countDepartments()])
        : Promise.resolve(null),
    ]);

    const categoryIds = assetsByCategoryRaw.map((r) => r.categoryId).filter(Boolean) as string[];
    const categories = await dashboardRepository.categoryLookup(categoryIds);
    const catLookup = new Map(categories.map((c) => [c.id, c]));

    const totalAssets = Object.values(
      foldStatusCounts(assetsByStatus, 'status', ASSET_STATUS_KEYS),
    ).reduce((a, b) => a + b, 0);

    const [activityItems, activityTotal] = recentActivity;

    return {
      role: actor.role,
      scope: {
        departmentId: scope.departmentId ?? null,
        employeeId: scope.employeeId ?? null,
      },
      generatedAt: new Date().toISOString(),
      kpis: {
        totalAssets,
        totalAssetValue: totalAssetValue._sum.currentValue ?? 0,
        totalPurchaseCost: totalAssetValue._sum.purchaseCost ?? 0,
        overdueAllocations,
        openMaintenance:
          (maintenanceByStatus.find((r) => r.status === 'PENDING')?._count._all ?? 0) +
          (maintenanceByStatus.find((r) => r.status === 'ASSIGNED')?._count._all ?? 0) +
          (maintenanceByStatus.find((r) => r.status === 'IN_PROGRESS')?._count._all ?? 0),
        upcomingBookings: upcomingBookings.reduce((sum, r) => sum + r._count._all, 0),
        openDiscrepancies,
        ...(admin
          ? {
              activeUsers: admin[0][0],
              activeDepartments: admin[1],
            }
          : {}),
      },
      charts: {
        assetsByStatus: foldStatusCounts(assetsByStatus, 'status', ASSET_STATUS_KEYS),
        assetsByCondition: Object.fromEntries(
          assetsByCondition.map((r) => [r.condition, r._count._all]),
        ),
        allocationsByStatus: foldStatusCounts(
          allocationsByStatus,
          'status',
          ALLOCATION_STATUS_KEYS,
        ),
        maintenanceByStatus: foldStatusCounts(
          maintenanceByStatus,
          'status',
          MAINTENANCE_STATUS_KEYS,
        ),
        maintenanceByPriority: Object.fromEntries(
          maintenanceByPriority.map((r) => [r.priority, r._count._all]),
        ),
        bookingsByStatus: foldStatusCounts(bookingsByStatus, 'status', BOOKING_STATUS_KEYS),
        auditByStatus: Object.fromEntries(
          auditByStatus.map((r) => [r.status as string, r._count._all]),
        ),
        topCategories: assetsByCategoryRaw
          .map((r) => ({
            categoryId: r.categoryId as string,
            name: catLookup.get(r.categoryId as string)?.name ?? 'Uncategorized',
            code: catLookup.get(r.categoryId as string)?.code ?? '—',
            count: r._count._all,
          }))
          .sort((a, b) => b.count - a.count),
      },
      series: {
        allocationsPerDay: bucketByDay(allocationsRaw, 'allocationDate', windowDays),
        maintenancePerDay: bucketByDay(maintenanceRaw, 'createdAt', windowDays),
      },
      recentActivity: {
        items: activityItems,
        total: activityTotal,
      },
    };
  },

  /** Just the KPI section — cheaper endpoint for polling widgets. */
  async kpis(user: RequestUser, departmentId?: string) {
    const actor = await resolveActor(user);
    const scope = scopeFor(actor, departmentId);
    const [assetsByStatus, allocationsByStatus, overdue, maintByStatus, upcoming, openDisc] =
      await Promise.all([
        dashboardRepository.countAssetsByStatus(scope),
        dashboardRepository.countAllocations(scope),
        dashboardRepository.countOverdueAllocations(scope),
        dashboardRepository.countMaintenance(scope),
        dashboardRepository.countBookings(scope, { upcomingOnly: true }),
        actor.role === ROLES.ADMIN || actor.role === ROLES.ASSET_MANAGER
          ? dashboardRepository.countOpenDiscrepancies()
          : Promise.resolve(0),
      ]);
    return {
      role: actor.role,
      totalAssets: assetsByStatus.reduce((s, r) => s + r._count._all, 0),
      allocated: allocationsByStatus.find((r) => r.status === 'ACTIVE')?._count._all ?? 0,
      overdueAllocations: overdue,
      openMaintenance: maintByStatus
        .filter((r) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status))
        .reduce((s, r) => s + r._count._all, 0),
      upcomingBookings: upcoming.reduce((s, r) => s + r._count._all, 0),
      openDiscrepancies: openDisc,
      generatedAt: new Date().toISOString(),
    };
  },

  /** Return a windowed time-series for the requested metric. */
  async timeseries(user: RequestUser, query: TimeseriesQuery) {
    const actor = await resolveActor(user);
    const scope = scopeFor(actor, query.departmentId);
    if (query.metric === 'allocations') {
      const rows = await dashboardRepository.allocationsPerDay(query.windowDays, scope);
      return {
        metric: query.metric,
        windowDays: query.windowDays,
        series: bucketByDay(rows, 'allocationDate', query.windowDays),
      };
    }
    const rows = await dashboardRepository.maintenancePerDay(query.windowDays, scope);
    return {
      metric: query.metric,
      windowDays: query.windowDays,
      series: bucketByDay(rows, 'createdAt', query.windowDays),
    };
  },
};
