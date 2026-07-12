import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { dashboardService } from '../services';
import { activityService } from '../services/activity.service';
import type {
  DashboardQuery,
  KpiQuery,
  ActivityQuery,
  TimelineParams,
  TimeseriesQuery,
} from '../validators/dashboard';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const dashboardController = {
  /**
   * GET /dashboard — full role-scoped overview (KPIs + charts + series + activity).
   */
  overview: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as DashboardQuery;
    const result = await dashboardService.overview(actor, query);
    sendSuccess(res, result, 'Dashboard overview fetched');
  }),

  /**
   * GET /dashboard/kpis — lightweight KPI-only payload for polling widgets.
   */
  kpis: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as KpiQuery;
    const result = await dashboardService.kpis(actor, query.departmentId);
    sendSuccess(res, result, 'KPIs fetched');
  }),

  /**
   * GET /dashboard/timeseries — windowed time-series for a specific metric.
   */
  timeseries: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as TimeseriesQuery;
    const result = await dashboardService.timeseries(actor, query);
    sendSuccess(res, result, 'Time series fetched');
  }),

  /**
   * GET /dashboard/activity — paginated activity log with filters and search.
   */
  activity: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const query = req.query as unknown as ActivityQuery;
    const result = await activityService.list(query);
    sendSuccess(res, result.items, 'Activity log fetched', 200, result.meta);
  }),

  /**
   * GET /dashboard/timeline/:entityType/:entityId — chronological history for an entity.
   */
  timeline: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const params = req.params as unknown as TimelineParams;
    const result = await activityService.timeline(params);
    sendSuccess(res, result.items, 'Entity timeline fetched');
  }),
};
