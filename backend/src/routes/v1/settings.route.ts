import { Router } from 'express';
import { settingsController } from '../../controllers';

const router = Router();

router.get('/', settingsController.getAll);
router.get('/:id', settingsController.getById);
router.post('/', settingsController.create);
router.put('/:id', settingsController.update);
router.delete('/:id', settingsController.delete);

export default router;
