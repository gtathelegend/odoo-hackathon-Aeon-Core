import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { assetCategoryService } from '../services';
import { resolvePagination } from '../utils/pagination';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/asset';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const assetCategoryController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { page, limit, skip } = resolvePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    } as never);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await assetCategoryService.list({ page, limit, skip, search });
    sendSuccess(res, result.items, 'Categories fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const category = await assetCategoryService.getById(id);
    sendSuccess(res, category, 'Category fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const category = await assetCategoryService.create(req.body as CreateCategoryInput, actor);
    sendCreated(res, category, 'Category created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const category = await assetCategoryService.update(id, req.body as UpdateCategoryInput, actor);
    sendSuccess(res, category, 'Category updated');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await assetCategoryService.remove(id, actor);
    sendNoContent(res);
  }),
};
