import type { Server as SocketServer, Namespace } from 'socket.io';
import { SOCKET_NAMESPACES } from '../../config/socket';
import { logger } from '../../config/logger';

/** Attach the /activity namespace. Event handlers are added later. */
export function registerActivityNamespace(io: SocketServer): Namespace {
  const nsp = io.of(SOCKET_NAMESPACES.ACTIVITY);
  nsp.on('connection', (socket) => {
    logger.debug(`activity socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`activity socket disconnected: ${socket.id}`);
    });
  });
  return nsp;
}
