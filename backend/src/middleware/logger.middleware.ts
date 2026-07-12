import morgan from 'morgan';
import type { RequestHandler } from 'express';
import { httpLogStream } from '../config/logger';
import { isProduction } from '../config/env';

/** HTTP request logging middleware wired into the winston logger. */
export const loggerMiddleware: RequestHandler = morgan(isProduction ? 'combined' : 'dev', {
  stream: httpLogStream,
});
