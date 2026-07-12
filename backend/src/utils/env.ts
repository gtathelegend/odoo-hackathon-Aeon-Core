/**
 * Convenience env helpers. The canonical parsed `env` object lives in
 * `config/env.ts`; this module exposes it plus small helpers for reading
 * unmanaged variables without bypassing validation.
 */
export { env, isDevelopment, isProduction, isTest } from '../config/env';

/** Return a required environment variable or throw a descriptive error. */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Return an optional environment variable with a default fallback. */
export function getEnv(key: string, fallback = ''): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : fallback;
}
