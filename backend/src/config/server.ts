import { env } from './env';

/**
 * HTTP server configuration derived from environment variables.
 * Centralized here so every layer reads consistent, typed values.
 */
export const serverConfig = {
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  bodyLimit: env.BODY_LIMIT,
  cors: {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: env.CORS_CREDENTIALS,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  cookieSecret: env.COOKIE_SECRET,
} as const;

export type ServerConfig = typeof serverConfig;
