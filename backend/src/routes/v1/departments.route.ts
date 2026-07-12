import { Router } from 'express';
import { departmentsController } from '../../controllers';

const router = Router();

router.get('/', departmentsController.getAll);
router.get('/:id', departmentsController.getById);
router.post('/', departmentsController.create);
router.put('/:id', departmentsController.update);
router.delete('/:id', departmentsController.delete);

export default router;
