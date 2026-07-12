import type { PaginationMeta } from './api-response.interface';

/** Query parameters accepted by list endpoints. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Resolved pagination values after defaults are applied. */
export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

/** Convenience response payload for paginated list endpoints. */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
