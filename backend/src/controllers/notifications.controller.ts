import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { notificationsService } from '../services';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const notificationsController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const unreadOnly = String(req.query.unreadOnly ?? '').toLowerCase() === 'true';
    const result = await notificationsService.list(actor.id, {
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
      unreadOnly,
    });
    sendSuccess(res, result.items, 'Notifications fetched', 200, result.meta);
  }),

  markRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await notificationsService.markRead(id, actor.id);
    sendSuccess(res, { id, readAt: new Date() }, 'Notification marked read');
  }),

  markAllRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const result = await notificationsService.markAllRead(actor.id);
    sendSuccess(res, result, 'All notifications marked read');
  }),
};
