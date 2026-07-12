import { logger } from '../config/logger';
import { allocationService } from '../services/allocation.service';
import { reportsService } from '../services/reports.service';

/** Poll intervals (ms). Keep short in dev, long in production. */
const OVERDUE_INTERVAL_MS = Number(process.env.OVERDUE_INTERVAL_MS ?? 15 * 60 * 1000); // 15 min
const SCHEDULED_REPORTS_INTERVAL_MS = Number(
  process.env.SCHEDULED_REPORTS_INTERVAL_MS ?? 60 * 60 * 1000,
); // 1 hour

const intervals: NodeJS.Timeout[] = [];

/**
 * Run the overdue allocation sweep. Idempotent by design — allocations that
 * were already flagged stay flagged; only ACTIVE rows with past-due
 * expectedReturnDate get bumped to OVERDUE.
 */
async function runOverdueSweep(): Promise<void> {
  try {
    const { flagged } = await allocationService.detectOverdue();
    if (flagged > 0) {
      logger.info(`scheduler.overdue: ${flagged} allocations flagged`);
    }
  } catch (error) {
    logger.error('scheduler.overdue failed', { error });
  }
}

/**
 * Run scheduled reports — check for saved reports with a schedule config
 * and execute + email them when the time window matches.
 */
async function runScheduledReports(): Promise<void> {
  try {
    const { executed } = await reportsService.runScheduledReports();
    if (executed > 0) {
      logger.info(`scheduler.reports: ${executed} scheduled reports executed`);
    }
  } catch (error) {
    logger.error('scheduler.reports failed', { error });
  }
}

/** Kick off recurring background jobs. */
export function startScheduler(): void {
  // Run once shortly after boot so freshly-started servers self-heal.
  const kickoff = setTimeout(() => void runOverdueSweep(), 30_000);
  kickoff.unref();

  const overdue = setInterval(() => void runOverdueSweep(), OVERDUE_INTERVAL_MS);
  overdue.unref();
  intervals.push(overdue);

  // Scheduled reports — run every hour (checks if any report's schedule matches)
  const reports = setInterval(() => void runScheduledReports(), SCHEDULED_REPORTS_INTERVAL_MS);
  reports.unref();
  intervals.push(reports);

  logger.info(
    `Scheduler started — overdue sweep every ${OVERDUE_INTERVAL_MS}ms, ` +
      `scheduled reports every ${SCHEDULED_REPORTS_INTERVAL_MS}ms`,
  );
}

/** Stop all scheduled intervals for graceful shutdown. */
export function stopScheduler(): void {
  while (intervals.length > 0) {
    const t = intervals.pop();
    if (t) clearInterval(t);
  }
  logger.info('Scheduler stopped');
}
