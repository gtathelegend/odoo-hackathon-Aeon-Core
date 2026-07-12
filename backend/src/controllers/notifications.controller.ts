import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNoContent } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { notificationsService } from '../services';
import type {
  NotificationListQuery,
  PreferenceUpdateInput,
  BulkPreferencesInput,
} from '../validators/notifications';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const notificationsController = {
  /**
   * GET /notifications — paginated notification list with filters.
   */
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as NotificationListQuery;
    const result = await notificationsService.list(actor.id, query);
    sendSuccess(res, result.items, 'Notifications fetched', 200, result.meta);
  }),

  /**
   * POST /notifications/:id/read — mark a single notification as read.
   */
  markRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await notificationsService.markRead(id, actor.id);
    sendSuccess(res, { id, readAt: new Date() }, 'Notification marked read');
  }),

  /**
   * POST /notifications/read-all — mark all notifications as read.
   */
  markAllRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const result = await notificationsService.markAllRead(actor.id);
    sendSuccess(res, result, 'All notifications marked read');
  }),

  /**
   * DELETE /notifications/:id — soft-delete a notification.
   */
  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await notificationsService.remove(id, actor.id);
    sendNoContent(res);
  }),

  /**
   * GET /notifications/preferences — list current user's notification preferences.
   */
  listPreferences: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const prefs = await notificationsService.listPreferences(actor.id);
    sendSuccess(res, prefs, 'Preferences fetched');
  }),

  /**
   * PUT /notifications/preferences — update a single preference.
   */
  updatePreference: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as PreferenceUpdateInput;
    const result = await notificationsService.updatePreference(actor.id, input, actor.id);
    sendSuccess(res, result, 'Preference updated');
  }),

  /**
   * PUT /notifications/preferences/bulk — replace all preferences at once.
   */
  replacePreferences: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as BulkPreferencesInput;
    const result = await notificationsService.replacePreferences(actor.id, input, actor.id);
    sendSuccess(res, result, 'Preferences saved');
  }),
};
