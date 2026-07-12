import { Router } from 'express';
import { notificationsController } from '../../controllers';

const router = Router();

router.get('/', notificationsController.getAll);
router.get('/:id', notificationsController.getById);
router.post('/', notificationsController.create);
router.put('/:id', notificationsController.update);
router.delete('/:id', notificationsController.delete);

export default router;
