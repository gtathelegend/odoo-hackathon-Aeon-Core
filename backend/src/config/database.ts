import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';
import { logger } from './logger';

/**
 * Prisma client singleton. Reused across the app to avoid exhausting the
 * Neon connection pool during development hot-reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Establish the database connection. Throws when the database is unreachable. */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

/** Cleanly close the database connection. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

/** Lightweight probe used by the health endpoint. */
export async function checkDatabase(): Promise<{ connected: boolean; latencyMs: number | null }> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latencyMs: Date.now() - started };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return { connected: false, latencyMs: null };
  }
}
