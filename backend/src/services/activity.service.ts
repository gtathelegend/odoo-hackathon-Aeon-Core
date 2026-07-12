import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { activityRepository } from '../repositories/activity.repository';
import { dashboardRepository } from '../repositories/dashboard.repository';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import { logger } from '../config/logger';
import { emitActivity } from '../socket/emit';
import type { ActivityQuery, TimelineParams } from '../validators/dashboard';

export interface LogActivityInput {
  action: string;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

/**
 * Append an ActivityLog row. Fire-and-forget from the caller's perspective:
 * failures are logged but never surfaced, so audit gaps never break
 * business flows. When a transaction client is supplied the write joins the
 * ambient transaction.
 */
export async function logActivity(
  input: LogActivityInput,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  try {
    await activityRepository.create(client, {
      action: input.action,
      userId: input.userId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    });
    emitActivity('activity', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId ?? null,
      at: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn('activity log write failed', { error, action: input.action });
  }
}

export const activityService = {
  logActivity,

  async list(query: ActivityQuery) {
    const { page, limit, skip } = resolvePagination({
      page: query.page,
      limit: query.limit,
    });
    const [items, total] = await dashboardRepository.recentActivity({
      limit,
      skip,
      userId: query.userId,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from,
      to: query.to,
      action: query.action,
      search: query.search,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  async timeline(params: TimelineParams) {
    const items = await dashboardRepository.entityTimeline(params.entityType, params.entityId);
    return { items };
  },
};
