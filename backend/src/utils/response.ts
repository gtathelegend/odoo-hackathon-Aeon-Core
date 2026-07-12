import type { Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '../interfaces/api-response.interface';

/**
 * Success helpers ensure every 2xx response follows the standardized envelope:
 *   { success: true, message, data, meta? }
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = MESSAGES.SUCCESS,
  statusCode: number = HTTP_STATUS.OK,
  meta?: PaginationMeta | Record<string, unknown>,
): Response<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = MESSAGES.CREATED,
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

export function sendNoContent(res: Response): Response {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Error helper ensures every non-2xx response follows the standardized envelope:
 *   { success: false, message, error?, code? }
 */
export function sendError(
  res: Response,
  message: string = MESSAGES.INTERNAL_ERROR,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code = 'INTERNAL_ERROR',
  error?: unknown,
): Response<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    message,
    ...(error !== undefined ? { error } : {}),
    code,
  };
  return res.status(statusCode).json(body);
}
