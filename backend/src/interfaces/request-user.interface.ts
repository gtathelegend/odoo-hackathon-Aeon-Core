import type { Role } from '../constants/roles';

/** Authenticated principal attached to a request by the auth middleware. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  departmentId?: string | null;
  permissions?: string[];
}
