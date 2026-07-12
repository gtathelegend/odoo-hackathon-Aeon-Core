import { Router } from 'express';
import { dashboardController } from '../../controllers';

const router = Router();

router.get('/', dashboardController.getAll);
router.get('/:id', dashboardController.getById);
router.post('/', dashboardController.create);
router.put('/:id', dashboardController.update);
router.delete('/:id', dashboardController.delete);

export default router;
