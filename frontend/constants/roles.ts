/** User roles mirrored from the backend role hierarchy. */
export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  ASSET_MANAGER: 'ASSET_MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
