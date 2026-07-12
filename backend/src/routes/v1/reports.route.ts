import { Router } from 'express';
import { reportsController } from '../../controllers/reports.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/role.middleware';
import { ROLES } from '../../constants/roles';

const router = Router();

// All report routes require authentication + DEPARTMENT_HEAD or higher
router.use(authMiddleware);
router.use(requireMinRole(ROLES.DEPARTMENT_HEAD));

// GET /reports — list saved report configurations
router.get('/', reportsController.list);

// GET /reports/exports — list export history
router.get('/exports', reportsController.listExports);

// POST /reports/run — run an ad-hoc report (returns dataset)
router.post('/run', reportsController.run);

// POST /reports/export — run and export a report
router.post('/export', reportsController.export);

// GET /reports/:id — get a saved report by id
router.get('/:id', reportsController.getById);

// POST /reports — create a saved report
router.post('/', reportsController.create);

// PUT /reports/:id — update a saved report
router.put('/:id', reportsController.update);

// DELETE /reports/:id — delete a saved report
router.delete('/:id', reportsController.delete);

// GET /reports/:id/export — export a saved report
router.get('/:id/export', reportsController.exportSaved);

export default router;
