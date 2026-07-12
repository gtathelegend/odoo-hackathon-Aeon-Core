import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';

/**
 * Authentication middleware placeholder.
 * Token verification and user attachment are implemented in a later prompt.
 */
export function authMiddleware(
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  // TODO: verify JWT and attach req.user (implemented in a later prompt).
  next();
}
