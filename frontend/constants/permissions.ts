/** Permission keys. Concrete role-permission mappings are defined later. */
export const PERMISSIONS = {
  ASSET_CREATE: 'asset:create',
  ASSET_UPDATE: 'asset:update',
  ASSET_DELETE: 'asset:delete',
  BOOKING_MANAGE: 'booking:manage',
  MAINTENANCE_MANAGE: 'maintenance:manage',
  AUDIT_MANAGE: 'audit:manage',
  REPORT_VIEW: 'report:view',
  USER_MANAGE: 'user:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
