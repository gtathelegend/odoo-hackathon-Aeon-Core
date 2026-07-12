import { Router } from 'express';
import type { Request, Response } from 'express';
import { checkDatabase } from '../../config/database';
import { HTTP_STATUS } from '../../constants/http';
import { SERVICE_NAME, SERVICE_VERSION, API_VERSION } from '../../constants';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness + readiness probe
 *     description: Returns database connectivity, uptime, memory usage and service version.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       503:
 *         description: Service is degraded (database unreachable)
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    const db = await checkDatabase();
    const memory = process.memoryUsage();

    const payload = {
      status: db.connected ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      apiVersion: API_VERSION,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        connected: db.connected,
        latencyMs: db.latencyMs,
      },
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
      responseTimeMs: Date.now() - startedAt,
    };

    const statusCode = db.connected ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    sendSuccess(res, payload, 'Health check', statusCode);
  }),
);

export default router;
