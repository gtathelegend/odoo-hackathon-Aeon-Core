import { Router } from 'express';
import { assetCategoryController } from '../../controllers/asset-category.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ROLES } from '../../constants/roles';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../../validators/asset';

const router = Router();

router.use(authMiddleware);

router.get('/', assetCategoryController.list);
router.get('/:id', validate(categoryIdParamSchema, 'params'), assetCategoryController.getById);
router.post(
  '/',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(createCategorySchema),
  assetCategoryController.create,
);
router.put(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  assetCategoryController.update,
);
router.delete(
  '/:id',
  requireRole(ROLES.ASSET_MANAGER, ROLES.ADMIN),
  validate(categoryIdParamSchema, 'params'),
  assetCategoryController.remove,
);

export default router;
