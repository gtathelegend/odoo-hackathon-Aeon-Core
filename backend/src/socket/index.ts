import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { socketConfig } from '../config/socket';
import { logger } from '../config/logger';
import {
  registerNotificationsNamespace,
  registerDashboardNamespace,
  registerActivityNamespace,
} from './namespaces';

let io: SocketServer | undefined;

/**
 * Initialize the Socket.IO server and register domain namespaces. Event
 * payloads are implemented by the feature modules in later prompts.
 */
export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, socketConfig);

  io.on('connection', (socket) => {
    logger.debug(`root socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`root socket disconnected: ${socket.id}`);
    });
  });

  registerNotificationsNamespace(io);
  registerDashboardNamespace(io);
  registerActivityNamespace(io);

  logger.info('Socket.IO initialized with notifications/dashboard/activity namespaces');
  return io;
}

/** Access the initialized Socket.IO server instance. */
export function getIo(): SocketServer | undefined {
  return io;
}

/** Cleanly close the Socket.IO server. */
export async function closeSocket(): Promise<void> {
  if (!io) return;
  await new Promise<void>((resolve) => io!.close(() => resolve()));
  io = undefined;
  logger.info('Socket.IO server closed');
}
