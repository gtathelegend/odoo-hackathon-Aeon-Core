/** Frontend route paths. */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  ORGANIZATION: '/organization',
  ASSETS: '/assets',
  ALLOCATION: '/allocation',
  BOOKING: '/booking',
  MAINTENANCE: '/maintenance',
  AUDIT: '/audit',
  REPORTS: '/reports',
  ACTIVITY: '/activity',
} as const;

export type RouteKey = keyof typeof ROUTES;
