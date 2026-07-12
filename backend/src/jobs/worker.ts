import { logger } from '../config/logger';

/**
 * Background worker placeholder. Concrete workers (email, notifications,
 * report generation) are implemented in later prompts.
 */
export function startWorker(): void {
  logger.info('Worker initialized (no processors registered yet)');
}

export function stopWorker(): void {
  logger.info('Worker stopped');
}
