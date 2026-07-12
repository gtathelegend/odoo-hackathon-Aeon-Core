import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * ActivityLog repository. Records are append-only — updates and deletes are
 * intentionally *not* exposed.
 */
export const activityRepository = {
  create(
    client: PrismaClient | Prisma.TransactionClient,
    data: Prisma.ActivityLogUncheckedCreateInput,
  ) {
    return client.activityLog.create({ data });
  },
};
