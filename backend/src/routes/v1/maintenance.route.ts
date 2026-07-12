import { Router } from 'express';
import { maintenanceController } from '../../controllers';

const router = Router();

router.get('/', maintenanceController.getAll);
router.get('/:id', maintenanceController.getById);
router.post('/', maintenanceController.create);
router.put('/:id', maintenanceController.update);
router.delete('/:id', maintenanceController.delete);

export default router;
