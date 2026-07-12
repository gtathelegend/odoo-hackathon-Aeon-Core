import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap an async route handler so any rejected promise flows into Express'
 * error pipeline instead of crashing the request.
 *
 *     router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res as Res, next)).catch(next);
  };
}
