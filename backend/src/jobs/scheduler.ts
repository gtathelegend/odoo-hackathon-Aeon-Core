import { logger } from '../config/logger';

/**
 * Job scheduler placeholder. Cron definitions (overdue detection, booking
 * transitions, reminder dispatch, audit sweeps) are implemented in later
 * prompts. This module owns the schedule; workers own the execution.
 */
export function startScheduler(): void {
  logger.info('Scheduler initialized (no cron jobs registered yet)');
}

export function stopScheduler(): void {
  logger.info('Scheduler stopped');
}
