import { Router } from 'express';
import { departmentsController } from '../../controllers/departments.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { uuidParamSchema } from '../../validators/common';
import {
  createDepartmentSchema,
  departmentsListQuerySchema,
  updateDepartmentSchema,
} from '../../validators/departments';
import { ROLES } from '../../constants/roles';

const router = Router();

router.use(authMiddleware);

/**
 *  GET    /                — list departments (any authenticated user)
 *  GET    /tree            — full hierarchy (any authenticated user)
 *  POST   /                — create department (admin, asset manager)
 *  GET    /:id             — fetch a department (any authenticated user)
 *  PATCH  /:id             — update department (admin, asset manager)
 *  DELETE /:id             — soft-delete department (admin)
 */
router.get('/', validate(departmentsListQuerySchema, 'query'), departmentsController.list);
router.get('/tree', departmentsController.tree);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER),
  validate(createDepartmentSchema),
  departmentsController.create,
);

router.get('/:id', validate(uuidParamSchema, 'params'), departmentsController.get);

router.patch(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER),
  validate(uuidParamSchema, 'params'),
  validate(updateDepartmentSchema),
  departmentsController.update,
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  departmentsController.remove,
);

export default router;
