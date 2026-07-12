import { z } from 'zod';

/** Reusable primitive schemas shared across feature validators. */
export const idSchema = z.string().min(1);

export const emailSchema = z.string().email();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/** Basic email format check without constructing a schema. */
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}
