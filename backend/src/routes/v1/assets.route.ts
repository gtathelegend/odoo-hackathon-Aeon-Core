import { Router } from 'express';
import { assetsController } from '../../controllers';

const router = Router();

router.get('/', assetsController.getAll);
router.get('/:id', assetsController.getById);
router.post('/', assetsController.create);
router.put('/:id', assetsController.update);
router.delete('/:id', assetsController.delete);

export default router;
