import type { PaginationMeta, PaginationParams } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Normalize raw query params into safe pagination values. */
export function resolvePagination(params: PaginationParams = {}): Required<PaginationParams> {
  const page = Math.max(DEFAULT_PAGE, Number(params.page) || DEFAULT_PAGE);
  const rawLimit = Number(params.limit) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit };
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
