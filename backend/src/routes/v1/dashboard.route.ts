import { Router } from 'express';
import { dashboardController } from '../../controllers/dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// GET /dashboard — full role-scoped overview
router.get('/', dashboardController.overview);

// GET /dashboard/kpis — lightweight KPI payload for polling
router.get('/kpis', dashboardController.kpis);

// GET /dashboard/timeseries — windowed time-series for a metric
router.get('/timeseries', dashboardController.timeseries);

// GET /dashboard/activity — paginated activity log with search/filters
router.get('/activity', dashboardController.activity);

// GET /dashboard/timeline/:entityType/:entityId — entity history
router.get('/timeline/:entityType/:entityId', dashboardController.timeline);

export default router;
