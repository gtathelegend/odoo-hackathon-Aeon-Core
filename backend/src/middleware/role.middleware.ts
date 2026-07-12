import type { NextFunction, RequestHandler, Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import type { Role } from '../types';

/**
 * Role-based access control middleware factory placeholder.
 * Enforcement logic is implemented in a later prompt.
 */
export function requireRole(..._roles: Role[]): RequestHandler {
  return (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    // TODO: check req.user.role against allowed roles (later prompt).
    next();
  };
}
