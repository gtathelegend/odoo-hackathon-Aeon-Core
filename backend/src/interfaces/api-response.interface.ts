/** Pagination metadata attached to successful list responses. */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Standard success envelope returned by every endpoint. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

/** Standard failure envelope returned by every endpoint. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: unknown;
  code?: string;
}

/** Discriminated union covering every possible API response shape. */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
