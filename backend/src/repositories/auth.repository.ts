import type { Prisma, RefreshToken, User } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Auth repository. Owns every Prisma query that touches user credentials,
 * refresh tokens and login-adjacent metadata. Repositories are the only
 * layer allowed to speak Prisma so the service stays framework-agnostic.
 */
export const authRepository = {
  /** Find a user by email (returns null for soft-deleted or missing users). */
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  },

  /** Find a user by id (returns null for soft-deleted or missing users). */
  findUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /** Create a user with an already-hashed password. */
  createUser(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  /** Update a user by id. */
  updateUser(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  /** Update login-tracking counters. */
  markLoginSuccess(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  markLoginFailure(id: string, lockedUntil: Date | null): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: { increment: 1 },
        ...(lockedUntil ? { lockedUntil } : {}),
      },
    });
  },

  /** Locate a user by password-reset token hash. */
  findUserByResetTokenHash(tokenHash: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });
  },

  // -------- Refresh tokens --------

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findActiveRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  revokeRefreshToken(tokenHash: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllRefreshTokensForUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // -------- Login history --------

  recordLoginAttempt(
    data: Prisma.LoginHistoryUncheckedCreateInput,
  ): Promise<Prisma.BatchPayload | void> {
    return prisma.loginHistory.create({ data }).then(() => undefined);
  },
};
