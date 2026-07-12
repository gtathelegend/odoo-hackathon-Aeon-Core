import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import { serverConfig } from '../config/server';

/**
 * Global rate limiter applied to every API request. Feature modules can build
 * stricter limiters via `createRateLimiter` for hot-path endpoints.
 */
export const rateLimiter: RequestHandler = rateLimit({
  windowMs: serverConfig.rateLimit.windowMs,
  max: serverConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: MESSAGES.TOO_MANY_REQUESTS,
    code: 'RATE_LIMITED',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

/** Factory for building custom rate limiters. */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs ?? serverConfig.rateLimit.windowMs,
    max: options.max ?? serverConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: options.message ?? MESSAGES.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
    },
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  });
}
