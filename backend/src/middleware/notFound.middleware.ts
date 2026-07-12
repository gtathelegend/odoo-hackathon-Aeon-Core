import type { Request, Response } from 'express';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND,
    'NOT_FOUND',
  );
}
