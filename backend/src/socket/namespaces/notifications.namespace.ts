import type { Server as SocketServer, Namespace } from 'socket.io';
import { SOCKET_NAMESPACES } from '../../config/socket';
import { logger } from '../../config/logger';

/**
 * Attach the /notifications namespace. Clients may join a per-user room via
 * `join` so the server can push targeted events:
 *
 *   socket.emit('join', { userId })
 */
export function registerNotificationsNamespace(io: SocketServer): Namespace {
  const nsp = io.of(SOCKET_NAMESPACES.NOTIFICATIONS);
  nsp.on('connection', (socket) => {
    logger.debug(`notifications socket connected: ${socket.id}`);
    socket.on('join', (payload: { userId?: string }) => {
      if (payload?.userId) {
        socket.join(`user:${payload.userId}`);
      }
    });
    socket.on('disconnect', () => {
      logger.debug(`notifications socket disconnected: ${socket.id}`);
    });
  });
  return nsp;
}
