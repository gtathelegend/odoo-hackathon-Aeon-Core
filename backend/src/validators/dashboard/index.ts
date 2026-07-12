import { z } from 'zod';

const uuid = z.string().uuid();

/** Query schema for `GET /dashboard` — role-scoped overview endpoint. */
export const dashboardQuerySchema = z.object({
  /** Explicit department override — only honored for privileged roles. */
  departmentId: uuid.optional(),
  /** Time-series window length in days (defaults to 14). */
  windowDays: z.coerce.number().int().positive().max(180).optional(),
  /** Number of recent activity rows to include (defaults to 10). */
  activityLimit: z.coerce.number().int().positive().max(100).optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/** Query schema for `GET /dashboard/kpis`. */
export const kpiQuerySchema = z.object({
  departmentId: uuid.optional(),
});
export type KpiQuery = z.infer<typeof kpiQuerySchema>;

/** Query schema for `GET /dashboard/activity` — filters + pagination. */
export const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  userId: uuid.optional(),
  entityType: z.string().max(80).optional(),
  entityId: uuid.optional(),
  action: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

/** Query schema for `GET /dashboard/timeline/:entityType/:entityId`. */
export const timelineParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: uuid,
});
export type TimelineParams = z.infer<typeof timelineParamsSchema>;

/** Query for `GET /dashboard/timeseries`. */
export const timeseriesQuerySchema = z.object({
  metric: z.enum(['allocations', 'maintenance']),
  windowDays: z.coerce.number().int().positive().max(180).default(14),
  departmentId: uuid.optional(),
});
export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
