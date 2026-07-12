import { Router } from 'express';
import { maintenanceController } from '../../controllers/maintenance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ROLES } from '../../constants/roles';
import {
  assignMaintenanceSchema,
  createMaintenanceSchema,
  idParamSchema,
  maintenanceActionSchema,
  maintenanceListQuerySchema,
  resolveMaintenanceSchema,
} from '../../validators/maintenance';

const router = Router();
router.use(authMiddleware);

router.get('/', validate(maintenanceListQuerySchema, 'query'), maintenanceController.list);
router.get('/:id', validate(idParamSchema, 'params'), maintenanceController.getById);
router.post('/', validate(createMaintenanceSchema), maintenanceController.create);
router.post(
  '/:id/assign',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(idParamSchema, 'params'),
  validate(assignMaintenanceSchema),
  maintenanceController.assign,
);
router.post(
  '/:id/action',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(idParamSchema, 'params'),
  validate(maintenanceActionSchema),
  maintenanceController.action,
);
router.post(
  '/:id/resolve',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(idParamSchema, 'params'),
  validate(resolveMaintenanceSchema),
  maintenanceController.resolve,
);

export default router;
