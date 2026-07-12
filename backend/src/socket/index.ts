import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let io: SocketServer | undefined;

/**
 * Initialize the Socket.IO server.
 * Event handlers and namespaces are implemented in a later prompt.
 */
export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/** Access the initialized Socket.IO server instance. */
export function getIo(): SocketServer | undefined {
  return io;
}
