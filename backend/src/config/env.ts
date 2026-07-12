import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment variable schema. Secrets are never hardcoded - they are read
 * from the process environment and validated here at startup.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  JWT_SECRET: z.string().default('change-me'),
  JWT_REFRESH_SECRET: z.string().default('change-me-refresh'),
  GROK_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
