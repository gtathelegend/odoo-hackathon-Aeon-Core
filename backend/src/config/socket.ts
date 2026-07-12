import type { ServerOptions } from 'socket.io';
import { env } from './env';

/**
 * Socket.IO server options. CORS origins mirror the HTTP server so browsers
 * are treated consistently between REST and WebSocket connections.
 */
export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: env.CORS_CREDENTIALS,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 60_000,
};

/** Named socket namespaces reserved for feature areas. */
export const SOCKET_NAMESPACES = {
  NOTIFICATIONS: '/notifications',
  DASHBOARD: '/dashboard',
  ACTIVITY: '/activity',
} as const;

export type SocketNamespace = (typeof SOCKET_NAMESPACES)[keyof typeof SOCKET_NAMESPACES];
