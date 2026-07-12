import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';
import { AuthenticationError, ValidationError } from '../utils/errors';
import {
  assetsService,
  assetAnalyticsService,
  assetAttachmentService,
  assetQrService,
  assetAllocationService,
  assetTransferService,
} from '../services';
import type {
  AllocateInput,
  AssetListQuery,
  CreateAssetInput,
  CreateTransferInput,
  DecideTransferInput,
  ReturnInput,
  TransitionInput,
  UpdateAssetInput,
} from '../validators/asset';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const assetsController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as AssetListQuery;
    const result = await assetsService.list(query, actor);
    sendSuccess(res, result.items, 'Assets fetched', HTTP_STATUS.OK, result.meta);
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const result = await assetsService.getById(id, actor);
    sendSuccess(res, result, 'Asset fetched');
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as CreateAssetInput;
    const asset = await assetsService.create(input, actor);
    sendCreated(res, asset, 'Asset registered');
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as UpdateAssetInput;
    const asset = await assetsService.update(id, input, actor);
    sendSuccess(res, asset, 'Asset updated');
  }),

  transition: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as TransitionInput;
    const asset = await assetsService.transition(id, input, actor);
    sendSuccess(res, asset, `Asset transitioned to ${input.toStatus}`);
  }),

  // ---- Analytics ----
  analytics: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const data = await assetAnalyticsService.summary();
    sendSuccess(res, data, 'Asset analytics');
  }),

  // ---- Attachments ----
  listAttachments: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const items = await assetAttachmentService.list(id);
    sendSuccess(res, items, 'Attachments fetched');
  }),

  addAttachment: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) throw new ValidationError('No file uploaded (expected field: "file")');
    const attachment = await assetAttachmentService.add(id, file, actor);
    sendCreated(res, attachment, 'Attachment added');
  }),

  removeAttachment: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id, attachmentId } = req.params as { id: string; attachmentId: string };
    await assetAttachmentService.remove(id, attachmentId, actor);
    sendNoContent(res);
  }),

  // ---- QR ----
  ensureQr: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const qr = await assetQrService.ensureForAsset(id, actor);
    sendCreated(res, qr, 'QR code ready');
  }),

  regenerateQr: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const qr = await assetQrService.regenerate(id, actor);
    sendSuccess(res, qr, 'QR code regenerated');
  }),

  // ---- Allocation / return ----
  allocate: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as AllocateInput;
    const allocation = await assetAllocationService.allocate(id, input, actor);
    sendCreated(res, allocation, 'Asset allocated');
  }),

  processReturn: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as ReturnInput;
    const result = await assetAllocationService.processReturn(id, input, actor);
    sendSuccess(res, result, 'Asset returned');
  }),

  // ---- Transfers ----
  listTransfers: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const { id } = req.params as { id: string };
    const items = await assetTransferService.list(id);
    sendSuccess(res, items, 'Transfer requests fetched');
  }),

  createTransfer: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as CreateTransferInput;
    const created = await assetTransferService.create(id, input, actor);
    sendCreated(res, created, 'Transfer request created');
  }),

  decideTransfer: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { transferId } = req.params as { transferId: string };
    const input = req.body as DecideTransferInput;
    const decided = await assetTransferService.decide(transferId, input, actor);
    sendSuccess(res, decided, `Transfer ${input.decision.toLowerCase()}`);
  }),
};
