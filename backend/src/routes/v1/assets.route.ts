import { Router } from 'express';
import { assetsController } from '../../controllers';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { upload } from '../../middleware/upload.middleware';
import { ROLES } from '../../constants/roles';
import {
  allocateSchema,
  assetIdParamSchema,
  assetListQuerySchema,
  createAssetSchema,
  createTransferSchema,
  decideTransferSchema,
  returnSchema,
  transitionSchema,
  updateAssetSchema,
} from '../../validators/asset';

const router = Router();

// Every asset endpoint requires an authenticated user.
router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Assets
 *     description: Asset registration, lifecycle, allocation, transfers, and analytics
 */

// ---- Analytics (read-only, all roles) ----
router.get('/analytics', assetsController.analytics);

// ---- Directory ----
router.get('/', validate(assetListQuerySchema, 'query'), assetsController.list);

// ---- Create ----
router.post(
  '/',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(createAssetSchema),
  assetsController.create,
);

// ---- Passport / detail ----
router.get('/:id', validate(assetIdParamSchema, 'params'), assetsController.getById);

// ---- Update (optimistic lock) ----
router.put(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  validate(updateAssetSchema),
  assetsController.update,
);

// ---- Lifecycle transitions ----
router.post(
  '/:id/transition',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  validate(transitionSchema),
  assetsController.transition,
);

// ---- Allocation ----
router.post(
  '/:id/allocate',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  validate(allocateSchema),
  assetsController.allocate,
);
router.post(
  '/:id/return',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  validate(returnSchema),
  assetsController.processReturn,
);

// ---- Attachments ----
router.get(
  '/:id/attachments',
  validate(assetIdParamSchema, 'params'),
  assetsController.listAttachments,
);
router.post(
  '/:id/attachments',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  upload.single('file'),
  assetsController.addAttachment,
);
router.delete(
  '/:id/attachments/:attachmentId',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  assetsController.removeAttachment,
);

// ---- QR ----
router.post(
  '/:id/qr',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  assetsController.ensureQr,
);
router.post(
  '/:id/qr/regenerate',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(assetIdParamSchema, 'params'),
  assetsController.regenerateQr,
);

// ---- Transfers ----
router.get(
  '/:id/transfers',
  validate(assetIdParamSchema, 'params'),
  assetsController.listTransfers,
);
router.post(
  '/:id/transfers',
  validate(assetIdParamSchema, 'params'),
  validate(createTransferSchema),
  assetsController.createTransfer,
);
router.post(
  '/transfers/:transferId/decide',
  requireRole(ROLES.DEPARTMENT_HEAD, ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(decideTransferSchema),
  assetsController.decideTransfer,
);

export default router;
