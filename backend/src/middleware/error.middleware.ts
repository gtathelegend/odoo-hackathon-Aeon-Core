import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { BaseError } from '../utils/errors';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import { isProduction } from '../config/env';

/** Convert any thrown value into the standardized failure envelope. */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // next is required for Express to treat this as an error handler.
  _next: NextFunction,
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;

  if (err instanceof BaseError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack, requestId });
    }
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(
      res,
      MESSAGES.VALIDATION_FAILED,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
      err.flatten(),
    );
    return;
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack, requestId });
  sendError(
    res,
    isProduction ? MESSAGES.INTERNAL_ERROR : err.message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    'INTERNAL_ERROR',
  );
}
