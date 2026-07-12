import { apiClient, type ApiResponse } from '../lib/api-client';
import type { AuthRole, AuthUser } from '../store/auth.store';

export interface UserSummary extends AuthUser {
  phone?: string | null;
  createdAt?: string;
  employee?: {
    id: string;
    employeeCode: string;
    designation: string | null;
    departmentId: string | null;
    department: { id: string; name: string; code: string } | null;
  } | null;
}

export interface UsersListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AuthRole;
  isActive?: boolean;
  departmentId?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: AuthRole;
  departmentId?: string;
  designation?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: AuthRole;
  isActive?: boolean;
  departmentId?: string | null;
  designation?: string;
}

export const usersService = {
  async list(query?: UsersListQuery): Promise<ApiResponse<UserSummary[]>> {
    return apiClient.raw<UserSummary[]>('/users', { query: query as Record<string, string | number | boolean | undefined | null> | undefined });
  },
  get(id: string): Promise<UserSummary> {
    return apiClient.get<UserSummary>(`/users/${id}`);
  },
  create(payload: CreateUserPayload): Promise<UserSummary> {
    return apiClient.post<UserSummary>('/users', payload);
  },
  update(id: string, payload: UpdateUserPayload): Promise<UserSummary> {
    return apiClient.patch<UserSummary>(`/users/${id}`, payload);
  },
  remove(id: string): Promise<unknown> {
    return apiClient.delete(`/users/${id}`);
  },
  assignRole(id: string, role: AuthRole): Promise<UserSummary> {
    return apiClient.post<UserSummary>(`/users/${id}/role`, { role });
  },
};
