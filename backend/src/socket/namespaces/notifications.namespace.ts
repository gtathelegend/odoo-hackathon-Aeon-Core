import type { Server as SocketServer, Namespace } from 'socket.io';
import { SOCKET_NAMESPACES } from '../../config/socket';
import { logger } from '../../config/logger';

/** Attach the /notifications namespace. Event handlers are added later. */
export function registerNotificationsNamespace(io: SocketServer): Namespace {
  const nsp = io.of(SOCKET_NAMESPACES.NOTIFICATIONS);
  nsp.on('connection', (socket) => {
    logger.debug(`notifications socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`notifications socket disconnected: ${socket.id}`);
    });
  });
  return nsp;
}
