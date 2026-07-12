/**
 * Domain status enumerations, mirrored from the Prisma schema.
 * Kept as plain string constants so the API layer can validate inputs
 * without importing Prisma-generated enums into request/response types.
 */
export const ASSET_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ALLOCATED: 'ALLOCATED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  LOST: 'LOST',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
} as const;
export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const ALLOCATION_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type AllocationStatus = (typeof ALLOCATION_STATUS)[keyof typeof ALLOCATION_STATUS];

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const MAINTENANCE_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export const AUDIT_STATUS = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];

export const NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
