import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { serverConfig } from './config/server';
import { logger } from './config/logger';
import { initSocket, closeSocket } from './socket';
import { registerJobs, shutdownJobs } from './jobs';
import { SERVICE_NAME, SERVICE_VERSION, API_PREFIX, API_VERSION } from './constants';

let shuttingDown = false;

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  // Establish infrastructure connections before accepting traffic.
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Database bootstrap failed; continuing so the process stays observable', {
      error,
    });
  }

  initSocket(httpServer);
  registerJobs();

  httpServer.listen(serverConfig.port, () => {
    logger.info(
      `${SERVICE_NAME} v${SERVICE_VERSION} listening on http://localhost:${serverConfig.port}${API_PREFIX}/${API_VERSION} [${env.NODE_ENV}]`,
    );
  });

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
    shutdownTimeout.unref();

    httpServer.close(async () => {
      logger.info('HTTP server closed');
      try {
        shutdownJobs();
        await closeSocket();
        await disconnectDatabase();
      } catch (error) {
        logger.error('Error during graceful shutdown', { error });
      } finally {
        clearTimeout(shutdownTimeout);
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    shutdown('uncaughtException');
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
