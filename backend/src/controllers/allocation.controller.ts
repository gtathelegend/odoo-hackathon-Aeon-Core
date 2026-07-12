import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { allocationService, assetAllocationService } from '../services';
import type {
  AllocationListQuery,
  CreateAllocationInput,
  ExtendAllocationInput,
} from '../validators/allocation';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const allocationController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as AllocationListQuery;
    const result = await allocationService.list(query, actor);
    sendSuccess(res, result.items, 'Allocations fetched', 200, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const allocation = await allocationService.getById(id, actor);
    sendSuccess(res, allocation, 'Allocation fetched');
  }),

  /** POST /allocation — thin wrapper around the asset-side allocate path. */
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as CreateAllocationInput;
    // We don't have a version-locked path here because /allocation/POST is
    // used by tools that don't already hold the asset version. Fetch it now.
    const asset = await (
      await import('../repositories/assets.repository')
    ).assetsRepository.findById(input.assetId);
    if (!asset) {
      throw new (await import('../utils/errors')).NotFoundError('Asset not found');
    }
    const allocation = await assetAllocationService.allocate(
      input.assetId,
      {
        employeeId: input.employeeId,
        expectedReturnDate: input.expectedReturnDate,
        allocationCondition: input.allocationCondition,
        notes: input.notes,
        version: asset.version,
      },
      actor,
    );
    sendCreated(res, allocation, 'Asset allocated');
  }),

  extend: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as ExtendAllocationInput;
    const updated = await allocationService.extend(id, input, actor);
    sendSuccess(res, updated, 'Allocation extended');
  }),
};
