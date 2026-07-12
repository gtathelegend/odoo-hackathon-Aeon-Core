import { Router } from 'express';
import { allocationController } from '../../controllers';

const router = Router();

router.get('/', allocationController.getAll);
router.get('/:id', allocationController.getById);
router.post('/', allocationController.create);
router.put('/:id', allocationController.update);
router.delete('/:id', allocationController.delete);

export default router;
