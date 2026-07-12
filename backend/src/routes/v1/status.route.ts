import { Router } from 'express';
import type { Request, Response } from 'express';
import { checkDatabase } from '../../config/database';
import { SERVICE_NAME, SERVICE_VERSION, API_VERSION } from '../../constants';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * @openapi
 * /status:
 *   get:
 *     tags: [Health]
 *     summary: Deep status probe
 *     description: Extended runtime status including process metadata and dependencies.
 *     responses:
 *       200:
 *         description: Runtime status details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = await checkDatabase();
    const memory = process.memoryUsage();

    sendSuccess(res, {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      apiVersion: API_VERSION,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      database: db,
      memory,
    });
  }),
);

export default router;
