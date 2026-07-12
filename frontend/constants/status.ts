/** Shared status enumerations used across features. */
export const ASSET_STATUS = {
  AVAILABLE: 'available',
  ALLOCATED: 'allocated',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
  LOST: 'lost',
  RETIRED: 'retired',
  DISPOSED: 'disposed',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const MAINTENANCE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;
