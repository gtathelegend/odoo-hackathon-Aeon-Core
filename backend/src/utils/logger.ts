import path from 'path';
import winston from 'winston';
import { env, isProduction } from '../config/env';

const logDir = path.resolve(process.cwd(), 'logs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} [${level}] ${stack ?? message}`;
  }),
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Winston logger with separate error.log and combined.log files.
 * Console logging is always enabled for development visibility.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
  exitOnError: false,
});

if (!isProduction) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

/** Stream adapter so morgan can pipe HTTP logs into winston. */
export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
