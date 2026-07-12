import type { NextFunction, RequestHandler, Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { Role } from '../constants/roles';
import { hasRoleAtLeast } from '../constants/roles';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

/**
 * Require the authenticated user to hold one of the listed roles.
 * `req.user` must have been populated by `authMiddleware` upstream.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }
    next();
  };
}

/** Require the authenticated user's role to be at least `minRole` in the hierarchy. */
export function requireMinRole(minRole: Role): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError('Authentication required'));
    if (!hasRoleAtLeast(req.user.role, minRole)) {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }
    next();
  };
}

/** Alias so route files can read expressively: `router.get(..., authorize(ROLES.ADMIN))`. */
export const authorize = requireRole;
