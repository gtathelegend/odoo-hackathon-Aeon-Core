import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Notifications repository.
 *
 * Backs the in-app notification center, per-user preferences, and delivery
 * tracking. The `create` overload accepts either the singleton client or a
 * transaction client so producer code can bundle the notification write with
 * the business change that triggered it.
 */

export const notificationsRepository = {
  findForUser(
    userId: string,
    params: {
      unreadOnly?: boolean;
      priority?: string;
      type?: string;
      search?: string;
      skip: number;
      take: number;
    },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
      ...(params.unreadOnly ? { readAt: null } : {}),
      ...(params.priority
        ? { priority: params.priority as Prisma.NotificationWhereInput['priority'] }
        : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { message: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null, deletedAt: null } }),
    ]);
  },

  findById(id: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });
  },

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, readAt: null, deletedAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
  },

  softDelete(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  create(
    client: PrismaClient | Prisma.TransactionClient,
    data: Prisma.NotificationUncheckedCreateInput,
  ) {
    return client.notification.create({ data });
  },

  /** Preferences ---------------------------------------------------------- */

  listPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ category: 'asc' }, { channel: 'asc' }],
    });
  },

  upsertPreference(
    userId: string,
    channel: Prisma.NotificationPreferenceUncheckedCreateInput['channel'],
    category: string,
    enabled: boolean,
    actorId?: string,
  ) {
    return prisma.notificationPreference.upsert({
      where: {
        userId_channel_category: { userId, channel, category },
      },
      create: {
        userId,
        channel,
        category,
        enabled,
        createdBy: actorId,
        updatedBy: actorId,
      },
      update: {
        enabled,
        updatedBy: actorId,
      },
    });
  },

  /** Check whether a channel is enabled for a given user + category. Returns
   *  `true` when no explicit preference row exists (opt-out semantics). */
  async isChannelEnabled(
    userId: string,
    channel: Prisma.NotificationPreferenceWhereInput['channel'],
    category: string,
  ): Promise<boolean> {
    const rows = await prisma.notificationPreference.findMany({
      where: {
        userId,
        channel,
        deletedAt: null,
        category: { in: [category, 'all'] },
      },
    });
    if (rows.length === 0) return true;
    const exact = rows.find((r) => r.category === category);
    if (exact) return exact.enabled;
    return rows[0]?.enabled ?? true;
  },

  /** Deliveries ----------------------------------------------------------- */

  recordDelivery(
    client: PrismaClient | Prisma.TransactionClient,
    data: Prisma.NotificationDeliveryUncheckedCreateInput,
  ) {
    return client.notificationDelivery.create({ data });
  },
};
