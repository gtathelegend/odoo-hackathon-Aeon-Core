import { Router } from 'express';
import { allocationController } from '../../controllers/allocation.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ROLES } from '../../constants/roles';
import {
  allocationListQuerySchema,
  createAllocationSchema,
  extendAllocationSchema,
  idParamSchema,
} from '../../validators/allocation';

const router = Router();
router.use(authMiddleware);

router.get('/', validate(allocationListQuerySchema, 'query'), allocationController.list);
router.get('/:id', validate(idParamSchema, 'params'), allocationController.getById);
router.post(
  '/',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(createAllocationSchema),
  allocationController.create,
);
router.post(
  '/:id/extend',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(idParamSchema, 'params'),
  validate(extendAllocationSchema),
  allocationController.extend,
);

export default router;
