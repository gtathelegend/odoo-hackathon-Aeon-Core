import { Router } from 'express';
import type { Request, Response } from 'express';
import { SERVICE_NAME, SERVICE_VERSION, API_VERSION } from '../../constants';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * @openapi
 * /version:
 *   get:
 *     tags: [Health]
 *     summary: Service and API version
 *     responses:
 *       200:
 *         description: Version information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 */
router.get('/', (_req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      apiVersion: API_VERSION,
      node: process.version,
      environment: process.env.NODE_ENV ?? 'development',
    },
    'Version',
  );
});

export default router;
