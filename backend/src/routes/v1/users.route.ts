import { Router } from 'express';
import { usersController } from '../../controllers/users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { uuidParamSchema } from '../../validators/common';
import {
  assignRoleSchema,
  createUserSchema,
  updateUserSchema,
  usersListQuerySchema,
} from '../../validators/users';
import { ROLES } from '../../constants/roles';

const router = Router();

// Every users route requires authentication.
router.use(authMiddleware);

/**
 *  GET    /                — list users (admin, asset manager, department head)
 *  POST   /                — create user (admin, asset manager)
 *  GET    /:id             — get user by id (admin, asset manager, department head)
 *  PATCH  /:id             — update user (admin, asset manager)
 *  DELETE /:id             — soft-delete user (admin)
 *  POST   /:id/role        — assign role (admin)
 */
router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPARTMENT_HEAD),
  validate(usersListQuerySchema, 'query'),
  usersController.list,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER),
  validate(createUserSchema),
  usersController.create,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPARTMENT_HEAD),
  validate(uuidParamSchema, 'params'),
  usersController.get,
);

router.patch(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.ASSET_MANAGER),
  validate(uuidParamSchema, 'params'),
  validate(updateUserSchema),
  usersController.update,
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  usersController.remove,
);

router.post(
  '/:id/role',
  requireRole(ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(assignRoleSchema),
  usersController.assignRole,
);

export default router;
