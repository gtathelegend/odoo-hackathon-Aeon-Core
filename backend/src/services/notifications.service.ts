import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { notificationsRepository } from '../repositories/notifications.repository';
import { emitNotification, emitDashboard, emitActivity } from '../socket/emit';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';
import { logActivity } from './activity.service';
import { renderNotificationEmail, sendEmail } from './email.service';
import type {
  BulkPreferencesInput,
  NotificationListQuery,
  PreferenceUpdateInput,
} from '../validators/notifications';

export interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  /** Notification category for preference lookup — defaults to `type` or `all`. */
  category?: string;
  /** Force-disable email fanout regardless of user preference. */
  skipEmail?: boolean;
  /** Optional CTA to embed in the email body. */
  action?: { label: string; url: string };
}

/** Notification categories mapped from event types. */
function categoryFor(input: NotifyInput): string {
  if (input.category) return input.category;
  if (!input.type) return 'all';
  // Take the leading segment: e.g. ALLOCATION_OVERDUE -> allocation
  return (input.type?.split('_')[0] ?? 'all').toLowerCase();
}

/**
 * Persist a notification row and emit a socket event on the notifications
 * namespace targeting the recipient's per-user room. The write is optionally
 * scoped to an existing transaction so callers can commit the notification
 * together with the change that produced it.
 *
 * When the recipient hasn't disabled the EMAIL channel for this category we
 * also fan out to the email service. Email delivery is best-effort — failures
 * are logged but never propagated to the caller.
 */
export async function notify(
  input: NotifyInput,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  const category = categoryFor(input);
  try {
    const created = await notificationsRepository.create(client, {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? 'INFO',
      priority: input.priority ?? 'MEDIUM',
      status: 'SENT',
      entityType: input.entityType,
      entityId: input.entityId,
    });
    emitNotification(input.userId, 'notification', {
      id: created.id,
      title: created.title,
      message: created.message,
      priority: created.priority,
      type: created.type,
      createdAt: created.createdAt,
      entityType: created.entityType,
      entityId: created.entityId,
    });

    if (!input.skipEmail) {
      // Email is intentionally sent *after* commit-adjacent work — but we
      // detach it so a slow SMTP call never blocks the caller's transaction
      // response. We defer with a microtask so the transaction can commit
      // first when this call was made inside a $transaction block.
      const emailPayload = { ...input, category };
      queueMicrotask(() => {
        void fanoutEmail(emailPayload).catch((error) =>
          logger.warn('email fanout failed', { error, userId: input.userId }),
        );
      });
    }
  } catch (error) {
    logger.warn('notify failed', { error, userId: input.userId, title: input.title });
  }
}

async function fanoutEmail(input: NotifyInput & { category: string }): Promise<void> {
  const enabled = await notificationsRepository.isChannelEnabled(
    input.userId,
    'EMAIL',
    input.category,
  );
  if (!enabled) return;

  const user = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null, isActive: true },
    select: { email: true, firstName: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) return;

  const html = renderNotificationEmail({
    title: input.title,
    message: input.message,
    actionLabel: input.action?.label,
    actionUrl: input.action?.url,
  });
  const result = await sendEmail({
    to: user.email,
    subject: input.title,
    html,
    text: input.message,
  });
  await notificationsRepository
    .recordDelivery(prisma, {
      // We don't have the notification id here because we detached; a follow-up
      // enhancement is to look it up. For now we log a delivery keyed by the
      // most recent notification for this user + type.
      notificationId:
        (
          await prisma.notification.findFirst({
            where: { userId: input.userId, type: input.type ?? 'INFO' },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
        )?.id ?? '00000000-0000-0000-0000-000000000000',
      channel: 'EMAIL',
      status: result.delivered ? 'DELIVERED' : 'FAILED',
      attempts: 1,
      lastAttemptAt: new Date(),
      deliveredAt: result.delivered ? new Date() : null,
      error: result.delivered ? null : `transport=${result.via}`,
    })
    .catch(() => undefined);
}

/**
 * Broadcast a dashboard refresh + activity signal and persist an ActivityLog
 * row so the /activity feed remains queryable after refreshes.
 */
export function broadcastActivity(event: string, payload: unknown): void {
  emitDashboard('refresh', { event, payload, at: new Date().toISOString() });
  emitActivity(event, payload);

  // Persist to activity log (fire-and-forget). We extract common fields from
  // the payload when present so the log rows are query-friendly.
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const entityType = event.split('.')[0];
  const entityId =
    (p.id as string) ??
    (p.assetId as string) ??
    (p.allocationId as string) ??
    (p.bookingId as string) ??
    (p.requestId as string) ??
    (p.cycleId as string) ??
    undefined;
  void logActivity({
    action: event,
    entityType,
    entityId,
    metadata: p as Prisma.InputJsonValue,
  });
}

export const notificationsService = {
  async list(userId: string, query: NotificationListQuery) {
    const { page, limit, skip } = resolvePagination({
      page: query.page,
      limit: query.limit,
    });
    const [items, total, unread] = await notificationsRepository.findForUser(userId, {
      unreadOnly: query.unreadOnly,
      priority: query.priority,
      type: query.type,
      search: query.search,
      skip,
      take: limit,
    });
    return {
      items,
      meta: {
        ...buildPaginationMeta(total, page, limit),
        unreadCount: unread,
      },
    };
  },

  async markRead(id: string, userId: string) {
    const result = await notificationsRepository.markRead(id, userId);
    if (result.count === 0) throw new NotFoundError('Notification not found');
    return { updated: result.count };
  },

  async markAllRead(userId: string) {
    const result = await notificationsRepository.markAllRead(userId);
    emitNotification(userId, 'notifications:read-all', {
      at: new Date().toISOString(),
      updated: result.count,
    });
    return { updated: result.count };
  },

  async remove(id: string, userId: string) {
    const result = await notificationsRepository.softDelete(id, userId);
    if (result.count === 0) throw new NotFoundError('Notification not found');
    return { deleted: result.count };
  },

  async listPreferences(userId: string) {
    return notificationsRepository.listPreferences(userId);
  },

  async updatePreference(userId: string, input: PreferenceUpdateInput, actorId?: string) {
    return notificationsRepository.upsertPreference(
      userId,
      input.channel,
      input.category,
      input.enabled,
      actorId,
    );
  },

  async replacePreferences(userId: string, input: BulkPreferencesInput, actorId?: string) {
    return prisma.$transaction(
      input.preferences.map((p) =>
        prisma.notificationPreference.upsert({
          where: {
            userId_channel_category: { userId, channel: p.channel, category: p.category },
          },
          create: {
            userId,
            channel: p.channel,
            category: p.category,
            enabled: p.enabled,
            createdBy: actorId,
            updatedBy: actorId,
          },
          update: { enabled: p.enabled, updatedBy: actorId },
        }),
      ),
    );
  },
};
