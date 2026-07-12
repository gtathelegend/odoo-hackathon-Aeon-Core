import { Router } from 'express';
import v1Router from './v1';

/**
 * Root API router. Versioned routers mount here so /api/v2 can be added in the
 * future without breaking /api/v1 consumers.
 */
const router = Router();

router.use('/v1', v1Router);

export default router;
