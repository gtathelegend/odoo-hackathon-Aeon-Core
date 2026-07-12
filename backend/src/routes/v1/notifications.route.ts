import { Router } from 'express';
import { notificationsController } from '../../controllers/notifications.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// GET /notifications — paginated notification list
router.get('/', notificationsController.list);

// GET /notifications/preferences — list user's notification preferences
router.get('/preferences', notificationsController.listPreferences);

// PUT /notifications/preferences — update a single preference
router.put('/preferences', notificationsController.updatePreference);

// PUT /notifications/preferences/bulk — replace all preferences
router.put('/preferences/bulk', notificationsController.replacePreferences);

// POST /notifications/read-all — mark all as read
router.post('/read-all', notificationsController.markAllRead);

// POST /notifications/:id/read — mark single notification as read
router.post('/:id/read', notificationsController.markRead);

// DELETE /notifications/:id — remove a notification
router.delete('/:id', notificationsController.remove);

export default router;
