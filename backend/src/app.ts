import express from 'express';
import type { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { serverConfig } from './config/server';
import { swaggerSpec, SWAGGER_PATH } from './config/swagger';
import { API_PREFIX, SERVICE_NAME, SERVICE_VERSION } from './constants';
import apiRouter from './routes';
import {
  corsMiddleware,
  requestIdMiddleware,
  loggerMiddleware,
  rateLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware';
import { sendSuccess } from './utils/response';

/**
 * Build and configure the Express application. Kept as a factory so tests can
 * instantiate a fresh app per suite without spinning up the HTTP server.
 */
export function createApp(): Application {
  const app = express();

  // Trust the reverse proxy (Nginx, Cloudflare, Vercel) so req.ip/protocol are correct.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security & infrastructure middleware ---
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: serverConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: serverConfig.bodyLimit }));
  app.use(cookieParser(serverConfig.cookieSecret));
  app.use(loggerMiddleware);
  app.use(rateLimiter);

  // --- Root landing ---
  app.get('/', (_req, res) => {
    sendSuccess(res, {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      docs: SWAGGER_PATH,
      api: `${API_PREFIX}/v1`,
    });
  });

  // --- API documentation ---
  app.use(
    SWAGGER_PATH,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: `${SERVICE_NAME} — API Docs`,
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  // --- Versioned API routes ---
  app.use(API_PREFIX, apiRouter);

  // --- 404 + global error handler (must be last) ---
  app.use((req, res, next) => {
    if (res.headersSent) {
      next();
      return;
    }
    notFoundHandler(req, res);
  });
  app.use(errorHandler);

  return app;
}
