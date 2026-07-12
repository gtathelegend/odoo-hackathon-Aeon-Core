import type { Response } from 'express';
import { departmentsService } from '../services/departments.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import { MESSAGES } from '../constants/messages';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const departmentsController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { items, meta } = await departmentsService.list(req.query as never);
    sendSuccess(res, items, MESSAGES.FETCHED, 200, meta);
  }),

  tree: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const items = await departmentsService.tree();
    sendSuccess(res, items);
  }),

  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dept = await departmentsService.get(req.params.id!);
    sendSuccess(res, dept);
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dept = await departmentsService.create(req.body, req.user?.id);
    sendCreated(res, dept, 'Department created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dept = await departmentsService.update(req.params.id!, req.body, req.user?.id);
    sendSuccess(res, dept, MESSAGES.UPDATED);
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await departmentsService.remove(req.params.id!, req.user?.id);
    sendNoContent(res);
  }),
};
