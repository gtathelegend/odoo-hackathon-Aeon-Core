import { logger } from '../utils/logger';

/**
 * Scheduled jobs registry placeholder.
 * Cron definitions (overdue detection, booking transitions, reminders) are
 * implemented in a later prompt.
 */
export function registerJobs(): void {
  logger.info('Jobs registry initialized (no jobs scheduled yet)');
}
