import { Router } from 'express';
import type { Request, Response } from 'express';
import { SERVICE_NAME, SERVICE_VERSION } from '../../utils/constants';

const router = Router();

/**
 * GET /api/v1/health
 * Liveness probe for the AssetFlow API.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    version: SERVICE_VERSION,
    service: SERVICE_NAME,
  });
});

export default router;
