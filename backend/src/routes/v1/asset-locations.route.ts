import { Router } from 'express';
import { assetLocationController } from '../../controllers/asset-location.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ROLES } from '../../constants/roles';
import {
  createLocationSchema,
  locationIdParamSchema,
  updateLocationSchema,
} from '../../validators/asset';

const router = Router();

router.use(authMiddleware);

router.get('/', assetLocationController.list);
router.get('/:id', validate(locationIdParamSchema, 'params'), assetLocationController.getById);
router.post(
  '/',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(createLocationSchema),
  assetLocationController.create,
);
router.put(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(locationIdParamSchema, 'params'),
  validate(updateLocationSchema),
  assetLocationController.update,
);
router.delete(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(locationIdParamSchema, 'params'),
  assetLocationController.remove,
);

export default router;
