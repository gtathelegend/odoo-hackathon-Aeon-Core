import type { NextFunction, RequestHandler, Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import type { Role } from '../constants/roles';

/**
 * Role-based authorization middleware factory placeholder.
 * Enforcement logic is implemented in a later prompt.
 */
export function requireRole(..._roles: Role[]): RequestHandler {
  return (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    // TODO: check req.user.role against allowed roles (later prompt).
    next();
  };
}

/** Alias for teams that prefer the `authorize` naming. */
export const authorize = requireRole;
