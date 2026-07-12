import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { API_PREFIX } from './utils/constants';
import apiRouter from './routes';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

/** Build and configure the Express application. */
export function createApp(): Application {
  const app = express();

  // Security and parsing middleware.
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(loggerMiddleware);

  // API routes.
  app.use(API_PREFIX, apiRouter);

  // 404 + global error handling.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
