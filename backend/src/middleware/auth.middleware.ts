import type { NextFunction, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';
import { authRepository } from '../repositories/auth.repository';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { Role } from '../constants/roles';

/**
 * Extract a bearer token from the Authorization header or the signed
 * `af_access` cookie. Returns null when no credential is present.
 */
function extractToken(req: AuthenticatedRequest): string | null {
  const header = req.header('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const cookies = (req as unknown as { signedCookies?: Record<string, string> }).signedCookies;
  if (cookies?.af_access) return cookies.af_access;
  return null;
}

/**
 * Verify the JWT access token and attach `req.user`. Rejects the request
 * with a 401 when the token is missing, invalid, expired, or belongs to a
 * deactivated user.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw new AuthenticationError('Authentication required');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AuthenticationError('Invalid or expired access token');
    }
    if (!payload.sub) throw new AuthenticationError('Malformed access token');

    const user = await authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User is no longer active');
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Convenience helper for routes that should attempt authentication but not
 * require it (e.g. public endpoints that surface extra data when logged in).
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    if (payload.sub) {
      const user = await authRepository.findUserById(payload.sub);
      if (user?.isActive) {
        req.user = { id: user.id, email: user.email, role: user.role as Role };
      }
    }
  } catch {
    // Silent: treat as anonymous.
  }
  next();
}
