import { z } from 'zod';

/**
 * Shared primitive schemas used by feature-specific validators. Concrete
 * business validators (e.g. asset create/update payloads) are added in later
 * prompts.
 */
export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('id must be a UUID'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const searchQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
