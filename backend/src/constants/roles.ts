/** Application roles. Mirrors the Prisma UserRole enum. */
export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  ASSET_MANAGER: 'ASSET_MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  EMPLOYEE: 1,
  DEPARTMENT_HEAD: 2,
  ASSET_MANAGER: 3,
  ADMIN: 4,
};

/** Return true when `actor` has at least the same level as `required`. */
export function hasRoleAtLeast(actor: Role, required: Role): boolean {
  return ROLE_HIERARCHY[actor] >= ROLE_HIERARCHY[required];
}
