import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { activityService } from '../services/activity.service';
import type { ActivityQuery, TimelineParams } from '../validators/dashboard';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

/**
 * Standalone activity controller — mirrors the dashboard activity endpoints
 * but also adds the ability to query activity for a specific user (useful
 * for profile pages and admin audit).
 */
export const activityController = {
  /**
   * GET /activity — paginated activity log (same as /dashboard/activity).
   */
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const query = req.query as unknown as ActivityQuery;
    const result = await activityService.list(query);
    sendSuccess(res, result.items, 'Activity log fetched', 200, result.meta);
  }),

  /**
   * GET /activity/timeline/:entityType/:entityId — entity timeline.
   */
  timeline: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const params = req.params as unknown as TimelineParams;
    const result = await activityService.timeline(params);
    sendSuccess(res, result.items, 'Entity timeline fetched');
  }),
};
