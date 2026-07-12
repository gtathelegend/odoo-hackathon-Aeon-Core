import type { Server as SocketServer, Namespace } from 'socket.io';
import { SOCKET_NAMESPACES } from '../../config/socket';
import { logger } from '../../config/logger';

/** Attach the /dashboard namespace. Event handlers are added later. */
export function registerDashboardNamespace(io: SocketServer): Namespace {
  const nsp = io.of(SOCKET_NAMESPACES.DASHBOARD);
  nsp.on('connection', (socket) => {
    logger.debug(`dashboard socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`dashboard socket disconnected: ${socket.id}`);
    });
  });
  return nsp;
}
