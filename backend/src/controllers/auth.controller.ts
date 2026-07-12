import type { Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import { HTTP_STATUS } from '../constants/http';
import { MESSAGES } from '../constants/messages';
import { AuthenticationError } from '../utils/errors';
import { env } from '../config/env';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/** Cookie name used to carry the refresh token (httpOnly + signed). */
const REFRESH_COOKIE = 'af_refresh';
const ACCESS_COOKIE = 'af_access';

function cookieOptions(maxAgeMs: number): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    signed: true,
    maxAge: maxAgeMs,
    path: '/',
  };
}

function attachAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn * 1000));
  // Match refresh token lifetime — best-effort long window since JWT itself holds the source of truth.
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000));
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

function readRefreshToken(req: AuthenticatedRequest): string | undefined {
  const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  if (bodyToken) return bodyToken;
  const cookies = (req as unknown as { signedCookies?: Record<string, string> }).signedCookies;
  return cookies?.[REFRESH_COOKIE];
}

export const authController = {
  register: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.register(req.body);
    attachAuthCookies(res, result.tokens);
    sendCreated(res, result, 'Account created');
  }),

  login: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.login(req.body, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    attachAuthCookies(res, result.tokens);
    sendSuccess(res, result, 'Signed in');
  }),

  refresh: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) throw new AuthenticationError('Refresh token is required');
    const tokens = await authService.refresh(refreshToken);
    attachAuthCookies(res, tokens);
    sendSuccess(res, { tokens }, 'Tokens refreshed');
  }),

  logout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const refreshToken = readRefreshToken(req);
    await authService.logout(req.user?.id, refreshToken);
    clearAuthCookies(res);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Signed out' });
  }),

  me: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const user = await authService.me(req.user.id);
    sendSuccess(res, { user });
  }),

  updateProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const user = await authService.updateProfile(req.user.id, req.body);
    sendSuccess(res, { user }, MESSAGES.UPDATED);
  }),

  changePassword: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    await authService.changePassword(req.user.id, req.body);
    clearAuthCookies(res);
    sendSuccess(res, null, 'Password updated. Please sign in again.');
  }),

  forgotPassword: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    // Never reveal whether the email matched — respond with a generic message.
    sendSuccess(res, result ?? null, 'If the email exists, a reset link has been sent.');
  }),

  resetPassword: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, null, 'Password has been reset. Please sign in.');
  }),
};
