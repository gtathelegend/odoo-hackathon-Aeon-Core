import { getIo } from './index';
import { SOCKET_NAMESPACES } from '../config/socket';
import { logger } from '../config/logger';

/** Room name convention for per-user delivery. */
const userRoom = (userId: string): string => `user:${userId}`;

/**
 * Emit an event on a namespace to a specific user. Silently no-ops if the
 * socket server hasn't been initialized (e.g. tests) so callers never have
 * to guard the socket layer.
 */
export function emitToUser(
  namespace: string,
  userId: string,
  event: string,
  payload: unknown,
): void {
  const io = getIo();
  if (!io) return;
  try {
    io.of(namespace).to(userRoom(userId)).emit(event, payload);
  } catch (error) {
    logger.warn('socket emit failed', { namespace, userId, event, error });
  }
}

/** Broadcast an event on a namespace to every connected client. */
export function broadcast(namespace: string, event: string, payload: unknown): void {
  const io = getIo();
  if (!io) return;
  try {
    io.of(namespace).emit(event, payload);
  } catch (error) {
    logger.warn('socket broadcast failed', { namespace, event, error });
  }
}

/** Notify a specific user's notification stream. */
export function emitNotification(userId: string, event: string, payload: unknown): void {
  emitToUser(SOCKET_NAMESPACES.NOTIFICATIONS, userId, event, payload);
}

/** Broadcast a dashboard refresh event. */
export function emitDashboard(event: string, payload: unknown): void {
  broadcast(SOCKET_NAMESPACES.DASHBOARD, event, payload);
}

/** Broadcast an activity log event. */
export function emitActivity(event: string, payload: unknown): void {
  broadcast(SOCKET_NAMESPACES.ACTIVITY, event, payload);
}
