import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocket } from './socket';
import { registerJobs } from './jobs';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  initSocket(httpServer);
  registerJobs();

  httpServer.listen(env.PORT, () => {
    logger.info(`AssetFlow API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down gracefully`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
