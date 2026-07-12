import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { isProduction } from '../config/env';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Global error handler. Converts thrown errors into a standardized response
 * and logs unexpected failures.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // next is required for Express to treat this as an error handler.
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack });
    }
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  sendError(res, isProduction ? 'Internal server error' : err.message, 500);
}
