import bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { env } from '../config/env';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateToken, sha256 } from '../utils/crypto';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '../validators/auth';

/** bcrypt cost factor. 12 is standard for interactive login flows. */
const BCRYPT_ROUNDS = 12;

/** Lock the account for 15 minutes after 5 consecutive failed logins. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/** Password-reset token lifetime. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
}

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

function toProfile(user: User): AuthenticatedProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

function issueTokens(user: User): AuthTokens {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  // Advertise a rough expiry in seconds — the actual value is on the JWT itself.
  const match = env.JWT_ACCESS_TTL.match(/^(\d+)([smhd])$/);
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = match && map[match[2]!] ? Number(match[1]) * map[match[2]!]! : 900;
  return { accessToken, refreshToken, expiresIn: seconds };
}

async function persistRefreshToken(
  userId: string,
  refreshToken: string,
  ctx: LoginContext,
): Promise<void> {
  const tokenHash = sha256(refreshToken);
  // Refresh tokens follow env.JWT_REFRESH_TTL. We store an approximate expiry
  // matching the token payload so cleanup jobs can drop expired rows.
  const match = env.JWT_REFRESH_TTL.match(/^(\d+)([smhd])$/);
  const map: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const ms = match && map[match[2]!] ? Number(match[1]) * map[match[2]!]! : 7 * 86_400_000;
  await authRepository.createRefreshToken({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + ms),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });
}

async function recordLogin(
  userId: string | null,
  email: string,
  success: boolean,
  reason: string | undefined,
  ctx: LoginContext,
): Promise<void> {
  try {
    await authRepository.recordLoginAttempt({
      userId: userId ?? undefined,
      email,
      success,
      reason,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    // Login history is best-effort — never fail an auth flow because logging failed.
    logger.warn('Failed to record login attempt', { error, email });
  }
}

export const authService = {
  /** Self-signup. New accounts are created as EMPLOYEE. */
  async register(
    input: RegisterInput,
  ): Promise<{ user: AuthenticatedProfile; tokens: AuthTokens }> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: 'EMPLOYEE',
        },
      });
      // Auto-provision an employee record so downstream features can bind
      // allocations/bookings without a separate onboarding step.
      await tx.employee.create({
        data: {
          userId: created.id,
          employeeCode: `EMP-${created.id.slice(0, 8).toUpperCase()}`,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: created.id,
          action: 'auth.register',
          entityType: 'user',
          entityId: created.id,
        },
      });
      return created;
    });

    const tokens = issueTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, {});
    return { user: toProfile(user), tokens };
  },

  /** Password login with lockout after MAX_FAILED_ATTEMPTS failures. */
  async login(
    input: LoginInput,
    ctx: LoginContext,
  ): Promise<{ user: AuthenticatedProfile; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.isActive) {
      await recordLogin(null, input.email, false, 'invalid_credentials', ctx);
      throw new AuthenticationError('Invalid email or password');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await recordLogin(user.id, input.email, false, 'locked', ctx);
      throw new AuthenticationError(
        'Account temporarily locked due to failed attempts. Try again later.',
      );
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
      await authRepository.markLoginFailure(user.id, lockedUntil);
      await recordLogin(user.id, input.email, false, 'invalid_credentials', ctx);
      throw new AuthenticationError('Invalid email or password');
    }

    const updated = await authRepository.markLoginSuccess(user.id);
    const tokens = issueTokens(updated);
    await persistRefreshToken(updated.id, tokens.refreshToken, ctx);
    await recordLogin(updated.id, updated.email, true, undefined, ctx);
    await prisma.activityLog.create({
      data: {
        userId: updated.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: updated.id,
        ipAddress: ctx.ipAddress,
      },
    });
    return { user: toProfile(updated), tokens };
  },

  /** Rotate an access token using a valid refresh token. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    const tokenHash = sha256(refreshToken);
    const stored = await authRepository.findActiveRefreshToken(tokenHash);
    if (!stored || stored.userId !== payload.sub) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    const user = await authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User is no longer active');
    }
    // Rotate: revoke the old refresh token and issue a fresh pair.
    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = issueTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, {});
    return tokens;
  },

  /** Revoke the presented refresh token (if any) and all other user tokens. */
  async logout(userId: string | undefined, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await authRepository.revokeRefreshToken(sha256(refreshToken));
    }
    if (userId) {
      await authRepository.revokeAllRefreshTokensForUser(userId);
      await prisma.activityLog.create({
        data: { userId, action: 'auth.logout', entityType: 'user', entityId: userId },
      });
    }
  },

  /** Return the current authenticated user profile. */
  async me(userId: string): Promise<AuthenticatedProfile> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return toProfile(user);
  },

  /** Update the caller's own profile. */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthenticatedProfile> {
    const updated = await authRepository.updateUser(userId, { ...input, updatedBy: userId });
    return toProfile(updated);
  },

  /**
   * Password change while authenticated. Requires the current password to
   * pass a bcrypt check before we hash + persist the new one.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) throw new ValidationError('Current password is incorrect');
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await authRepository.updateUser(userId, {
      passwordHash,
      updatedBy: userId,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    // Force sign-out from every other session.
    await authRepository.revokeAllRefreshTokensForUser(userId);
  },

  /**
   * Start a forgot-password flow. Always resolves so we don't leak account
   * existence. When the email matches, we generate + persist a hashed token
   * and return the plaintext token (transport is up to the caller — dev
   * environments log it, production wires up an email provider).
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<{ resetToken?: string } | void> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.isActive) return;
    const rawToken = generateToken(32);
    const tokenHash = sha256(rawToken);
    await authRepository.updateUser(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    if (env.NODE_ENV !== 'production') {
      logger.info(`Password reset token for ${user.email}: ${rawToken}`);
      return { resetToken: rawToken };
    }
    // Production: hand off to email delivery in a later prompt.
    return;
  },

  /** Complete a forgot-password flow. Consumes the reset token. */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = sha256(input.token);
    const user = await authRepository.findUserByResetTokenHash(tokenHash);
    if (!user) throw new ValidationError('Invalid or expired reset token');
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await authRepository.updateUser(user.id, {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await authRepository.revokeAllRefreshTokensForUser(user.id);
  },
};
