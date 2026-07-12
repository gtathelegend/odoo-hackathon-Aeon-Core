import { Router } from 'express';
import { auditController } from '../../controllers';

const router = Router();

router.get('/', auditController.getAll);
router.get('/:id', auditController.getById);
router.post('/', auditController.create);
router.put('/:id', auditController.update);
router.delete('/:id', auditController.delete);

export default router;
