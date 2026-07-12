import { Router } from 'express';
import { ROUTES } from '../../constants/routes';

import healthRoute from './health.route';
import versionRoute from './version.route';
import statusRoute from './status.route';
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

router.use(ROUTES.HEALTH, healthRoute);
router.use(ROUTES.VERSION, versionRoute);
router.use(ROUTES.STATUS, statusRoute);
router.use(ROUTES.AUTH, authRoute);
router.use(ROUTES.USERS, usersRoute);
router.use(ROUTES.DEPARTMENTS, departmentsRoute);
router.use(ROUTES.ASSETS, assetsRoute);
router.use(ROUTES.ALLOCATION, allocationRoute);
router.use(ROUTES.BOOKING, bookingRoute);
router.use(ROUTES.MAINTENANCE, maintenanceRoute);
router.use(ROUTES.AUDIT, auditRoute);
router.use(ROUTES.REPORTS, reportsRoute);
router.use(ROUTES.NOTIFICATIONS, notificationsRoute);
router.use(ROUTES.ASSISTANT, assistantRoute);
router.use(ROUTES.DASHBOARD, dashboardRoute);
router.use(ROUTES.SETTINGS, settingsRoute);

export default router;
