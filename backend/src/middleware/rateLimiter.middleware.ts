import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Rate limiter middleware placeholder.
 * A concrete limiter (window, max, store) is configured in a later prompt.
 */
export function rateLimiter(): RequestHandler {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // TODO: enforce request limits (later prompt).
    next();
  };
}
