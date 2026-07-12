/** Canonical route path segments used by the v1 router. */
export const ROUTES = {
  HEALTH: '/health',
  VERSION: '/version',
  STATUS: '/status',
  AUTH: '/auth',
  USERS: '/users',
  DEPARTMENTS: '/departments',
  ASSETS: '/assets',
  ASSET_CATEGORIES: '/asset-categories',
  ASSET_LOCATIONS: '/asset-locations',
  ALLOCATION: '/allocation',
  BOOKING: '/booking',
  MAINTENANCE: '/maintenance',
  AUDIT: '/audit',
  DASHBOARD: '/dashboard',
  NOTIFICATIONS: '/notifications',
  ASSISTANT: '/assistant',
  REPORTS: '/reports',
  ACTIVITY: '/activity',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
