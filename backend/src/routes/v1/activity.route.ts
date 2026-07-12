import { Router } from 'express';
import { activityController } from '../../controllers/activity.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/role.middleware';
import { ROLES } from '../../constants/roles';

const router = Router();

// All activity routes require auth + at least DEPARTMENT_HEAD
router.use(authMiddleware);
router.use(requireMinRole(ROLES.DEPARTMENT_HEAD));

// GET /activity — paginated activity log with search/filters
router.get('/', activityController.list);

// GET /activity/timeline/:entityType/:entityId — entity history
router.get('/timeline/:entityType/:entityId', activityController.timeline);

export default router;
