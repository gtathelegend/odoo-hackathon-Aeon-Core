import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types';

/** Send a standardized success response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta,
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

/** Send a standardized error response. */
export function sendError(
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  details?: unknown,
): Response<ApiResponse<null>> {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(details ? { errors: details } : {}),
  });
}
