import type { PaginationMeta } from '../interfaces/api-response.interface';
import type { PaginationParams, ResolvedPagination } from '../interfaces/pagination.interface';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Normalize raw query params into safe pagination values with skip precomputed. */
export function resolvePagination(params: PaginationParams = {}): ResolvedPagination {
  const page = Math.max(DEFAULT_PAGE, Number(params.page) || DEFAULT_PAGE);
  const rawLimit = Number(params.limit) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const sortOrder: 'asc' | 'desc' = params.sortOrder === 'desc' ? 'desc' : 'asc';
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy: params.sortBy,
    sortOrder,
  };
}

/** Compute the Prisma skip offset for a given page/limit. */
export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** Build pagination metadata for a response payload. */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
