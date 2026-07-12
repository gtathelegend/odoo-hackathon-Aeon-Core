import { Router } from 'express';
import healthRoute from './health.route';
import authRoute from './auth.route';
import usersRoute from './users.route';
import departmentsRoute from './departments.route';
import assetsRoute from './assets.route';
import allocationRoute from './allocation.route';
import bookingRoute from './booking.route';
import maintenanceRoute from './maintenance.route';
import auditRoute from './audit.route';
import reportsRoute from './reports.route';
import notificationsRoute from './notifications.route';
import assistantRoute from './assistant.route';
import dashboardRoute from './dashboard.route';
import settingsRoute from './settings.route';

/** Aggregates all v1 routes under the /api/v1 prefix. */
const router = Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/users', usersRoute);
router.use('/departments', departmentsRoute);
router.use('/assets', assetsRoute);
router.use('/allocation', allocationRoute);
router.use('/booking', bookingRoute);
router.use('/maintenance', maintenanceRoute);
router.use('/audit', auditRoute);
router.use('/reports', reportsRoute);
router.use('/notifications', notificationsRoute);
router.use('/assistant', assistantRoute);
router.use('/dashboard', dashboardRoute);
router.use('/settings', settingsRoute);

export default router;
