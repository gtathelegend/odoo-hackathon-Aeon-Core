import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { auditService } from '../services';
import type {
  CreateCycleInput,
  CreateDiscrepancyInput,
  CycleListQuery,
  ResolveDiscrepancyInput,
  UpdateCycleInput,
  VerifyRecordInput,
} from '../validators/audit';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const auditController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const result = await auditService.listCycles(req.query as unknown as CycleListQuery);
    sendSuccess(res, result.items, 'Audit cycles fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const cycle = await auditService.getCycle(id);
    sendSuccess(res, cycle, 'Audit cycle fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const created = await auditService.createCycle(req.body as CreateCycleInput, actor);
    sendCreated(res, created, 'Audit cycle created');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const updated = await auditService.updateCycle(id, req.body as UpdateCycleInput, actor);
    sendSuccess(res, updated, 'Audit cycle updated');
  }),

  addRecord: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const assetId = (req.body as { assetId?: string }).assetId;
    if (!assetId) throw new ValidationError('assetId is required');
    const record = await auditService.addRecord(id, assetId, actor);
    sendCreated(res, record, 'Audit record added');
  }),

  verifyRecord: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { recordId } = req.params as { recordId: string };
    const updated = await auditService.verifyRecord(recordId, req.body as VerifyRecordInput, actor);
    sendSuccess(res, updated, 'Audit record verified');
  }),

  addDiscrepancy: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { recordId } = req.params as { recordId: string };
    const created = await auditService.addDiscrepancy(
      recordId,
      req.body as CreateDiscrepancyInput,
      actor,
    );
    sendCreated(res, created, 'Discrepancy added');
  }),

  resolveDiscrepancy: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { discrepancyId } = req.params as { discrepancyId: string };
    const updated = await auditService.resolveDiscrepancy(
      discrepancyId,
      req.body as ResolveDiscrepancyInput,
      actor,
    );
    sendSuccess(res, updated, 'Discrepancy resolved');
  }),
};
