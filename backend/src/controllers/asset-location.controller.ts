import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { assetLocationService } from '../services';
import { resolvePagination } from '../utils/pagination';
import type { CreateLocationInput, UpdateLocationInput } from '../validators/asset';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const assetLocationController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { page, limit, skip } = resolvePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    } as never);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await assetLocationService.list({ page, limit, skip, search });
    sendSuccess(res, result.items, 'Locations fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const location = await assetLocationService.getById(id);
    sendSuccess(res, location, 'Location fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const created = await assetLocationService.create(req.body as CreateLocationInput, actor);
    sendCreated(res, created, 'Location created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const updated = await assetLocationService.update(id, req.body as UpdateLocationInput, actor);
    sendSuccess(res, updated, 'Location updated');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await assetLocationService.remove(id, actor);
    sendNoContent(res);
  }),
};
