import type { NextFunction, Request, Response } from 'express';
import { generateUuid } from '../utils/uuid';

const HEADER = 'x-request-id';

/**
 * Assigns a stable request id to every incoming request. If the client supplies
 * one via the x-request-id header we honor it; otherwise we generate a UUID.
 * The value is echoed back on the response for tracing.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id = incoming && incoming.trim() !== '' ? incoming : generateUuid();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader(HEADER, id);
  next();
}
