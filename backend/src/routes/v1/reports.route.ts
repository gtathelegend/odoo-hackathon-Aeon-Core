import { Router } from 'express';
import { reportsController } from '../../controllers';

const router = Router();

router.get('/', reportsController.getAll);
router.get('/:id', reportsController.getById);
router.post('/', reportsController.create);
router.put('/:id', reportsController.update);
router.delete('/:id', reportsController.delete);

export default router;
