import type { Response } from 'express';
import { usersService } from '../services/users.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import { MESSAGES } from '../constants/messages';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const usersController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { items, meta } = await usersService.list(req.query as never);
    sendSuccess(res, items, MESSAGES.FETCHED, 200, meta);
  }),

  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await usersService.get(req.params.id!);
    sendSuccess(res, user);
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await usersService.create(req.body, req.user?.id);
    sendCreated(res, user, 'User created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await usersService.update(req.params.id!, req.body, req.user?.id);
    sendSuccess(res, user, MESSAGES.UPDATED);
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await usersService.remove(req.params.id!, req.user?.id);
    sendNoContent(res);
  }),

  assignRole: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await usersService.assignRole(req.params.id!, req.body, req.user?.id);
    sendSuccess(res, user, 'Role updated');
  }),
};
