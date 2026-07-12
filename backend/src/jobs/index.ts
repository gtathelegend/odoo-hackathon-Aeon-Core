import { startScheduler, stopScheduler } from './scheduler';
import { startWorker, stopWorker } from './worker';

/** Entry point invoked at server boot. */
export function registerJobs(): void {
  startScheduler();
  startWorker();
}

/** Entry point invoked on graceful shutdown. */
export function shutdownJobs(): void {
  stopWorker();
  stopScheduler();
}

export { startScheduler, stopScheduler, startWorker, stopWorker };
