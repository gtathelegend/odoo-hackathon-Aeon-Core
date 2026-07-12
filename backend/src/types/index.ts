/**
 * Shared TypeScript types for the AssetFlow API foundation.
 *
 * These are re-exports and lightweight aliases. Concrete domain models are
 * derived from the Prisma schema — the frontend/API contracts live in the
 * `interfaces` folder, and enumerations live in `constants`.
 */

export type { Role } from '../constants/roles';

export type {
  AssetStatus,
  AllocationStatus,
  BookingStatus,
  MaintenanceStatus,
  AuditStatus,
  NotificationStatus,
  Priority,
} from '../constants/status';

export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginationMeta,
} from '../interfaces/api-response.interface';

export type {
  PaginationParams,
  ResolvedPagination,
  PaginatedResponse,
} from '../interfaces/pagination.interface';

export type { RequestUser } from '../interfaces/request-user.interface';
export type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/** JWT payload emitted by the auth module. */
export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/** Environment-agnostic key/value dictionary. */
export type Dictionary<T = unknown> = Record<string, T>;
