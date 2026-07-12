import { Router } from 'express';
import { auditController } from '../../controllers/audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ROLES } from '../../constants/roles';
import {
  createCycleSchema,
  createDiscrepancySchema,
  cycleIdParamSchema,
  cycleListQuerySchema,
  recordIdParamSchema,
  resolveDiscrepancySchema,
  updateCycleSchema,
  verifyRecordSchema,
} from '../../validators/audit';

const router = Router();
router.use(authMiddleware);

router.get('/', validate(cycleListQuerySchema, 'query'), auditController.list);
router.get('/:id', validate(cycleIdParamSchema, 'params'), auditController.getById);
router.post(
  '/',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(createCycleSchema),
  auditController.create,
);
router.patch(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(cycleIdParamSchema, 'params'),
  validate(updateCycleSchema),
  auditController.update,
);

// Records (checklist items)
router.post(
  '/:id/records',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(cycleIdParamSchema, 'params'),
  auditController.addRecord,
);
router.post(
  '/:id/records/:recordId/verify',
  validate(recordIdParamSchema, 'params'),
  validate(verifyRecordSchema),
  auditController.verifyRecord,
);

// Discrepancies
router.post(
  '/:id/records/:recordId/discrepancies',
  validate(recordIdParamSchema, 'params'),
  validate(createDiscrepancySchema),
  auditController.addDiscrepancy,
);
router.post(
  '/discrepancies/:discrepancyId/resolve',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(resolveDiscrepancySchema),
  auditController.resolveDiscrepancy,
);

export default router;
