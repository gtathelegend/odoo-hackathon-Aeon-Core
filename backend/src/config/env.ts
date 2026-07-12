import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment variable schema. Secrets are never hardcoded — they are read
 * from the process environment and validated here at startup. The application
 * fails fast on missing or invalid required variables.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  DIRECT_URL: z.string().optional(),

  JWT_SECRET: z.string().min(1).default('change-me'),
  JWT_REFRESH_SECRET: z.string().min(1).default('change-me-refresh'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(1).default('change-me-cookie'),

  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  BODY_LIMIT: z.string().default('10mb'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug', 'silly']).default('info'),

  GROK_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),

  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_TEMP_DIR: z.string().default('uploads/temp'),
  UPLOAD_MAX_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment configuration:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error('Invalid environment configuration');
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
