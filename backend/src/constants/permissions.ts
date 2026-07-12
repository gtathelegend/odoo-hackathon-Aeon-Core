/**
 * Permission keys grouped by module. Concrete permission checks are wired up
 * by the auth module in a later prompt — the constants live here so every
 * feature references the same identifiers.
 */
export const PERMISSIONS = {
  // Assets
  ASSET_VIEW: 'asset.view',
  ASSET_CREATE: 'asset.create',
  ASSET_UPDATE: 'asset.update',
  ASSET_DELETE: 'asset.delete',

  // Users
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Departments
  DEPARTMENT_VIEW: 'department.view',
  DEPARTMENT_MANAGE: 'department.manage',

  // Allocation
  ALLOCATION_VIEW: 'allocation.view',
  ALLOCATION_MANAGE: 'allocation.manage',
  ALLOCATION_APPROVE: 'allocation.approve',

  // Booking
  BOOKING_VIEW: 'booking.view',
  BOOKING_CREATE: 'booking.create',
  BOOKING_MANAGE: 'booking.manage',

  // Maintenance
  MAINTENANCE_VIEW: 'maintenance.view',
  MAINTENANCE_CREATE: 'maintenance.create',
  MAINTENANCE_ASSIGN: 'maintenance.assign',
  MAINTENANCE_RESOLVE: 'maintenance.resolve',

  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_MANAGE: 'audit.manage',

  // Reports
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',

  // Settings
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
