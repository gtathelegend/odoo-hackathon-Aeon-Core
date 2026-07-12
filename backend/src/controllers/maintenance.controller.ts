import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { maintenanceService } from '../services';
import type {
  AssignMaintenanceInput,
  CreateMaintenanceInput,
  MaintenanceActionInput,
  MaintenanceListQuery,
  ResolveMaintenanceInput,
} from '../validators/maintenance';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const maintenanceController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const result = await maintenanceService.list(req.query as unknown as MaintenanceListQuery);
    sendSuccess(res, result.items, 'Maintenance requests fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const request = await maintenanceService.getById(id);
    sendSuccess(res, request, 'Maintenance request fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const created = await maintenanceService.create(req.body as CreateMaintenanceInput, actor);
    sendCreated(res, created, 'Maintenance request created');
  }),

  assign: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const updated = await maintenanceService.assign(id, req.body as AssignMaintenanceInput, actor);
    sendSuccess(res, updated, 'Technician assigned');
  }),

  action: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as MaintenanceActionInput;
    const updated = await maintenanceService.apply(id, input, actor);
    sendSuccess(res, updated, `Maintenance ${input.action}ed`);
  }),

  resolve: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const updated = await maintenanceService.resolve(
      id,
      req.body as ResolveMaintenanceInput,
      actor,
    );
    sendSuccess(res, updated, 'Maintenance resolved');
  }),
};
