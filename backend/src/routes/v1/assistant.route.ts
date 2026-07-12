import { Router } from 'express';
import { assistantController } from '../../controllers';

const router = Router();

router.get('/', assistantController.getAll);
router.get('/:id', assistantController.getById);
router.post('/', assistantController.create);
router.put('/:id', assistantController.update);
router.delete('/:id', assistantController.delete);

export default router;
