import { apiClient, type ApiResponse } from '../lib/api-client';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: DepartmentStatus;
  parentId: string | null;
  parent: { id: string; name: string; code: string } | null;
  _count?: { employees: number; children: number };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  version: number;
}

export interface DepartmentsListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: DepartmentStatus;
  parentId?: string;
  rootsOnly?: boolean;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateDepartmentPayload {
  name?: string;
  code?: string;
  description?: string | null;
  parentId?: string | null;
  status?: DepartmentStatus;
}

export const departmentsService = {
  list(query?: DepartmentsListQuery): Promise<ApiResponse<Department[]>> {
    return apiClient.raw<Department[]>('/departments', { query: query as Record<string, string | number | boolean | undefined | null> | undefined });
  },
  tree(): Promise<Department[]> {
    return apiClient.get<Department[]>('/departments/tree');
  },
  get(id: string): Promise<Department> {
    return apiClient.get<Department>(`/departments/${id}`);
  },
  create(payload: CreateDepartmentPayload): Promise<Department> {
    return apiClient.post<Department>('/departments', payload);
  },
  update(id: string, payload: UpdateDepartmentPayload): Promise<Department> {
    return apiClient.patch<Department>(`/departments/${id}`, payload);
  },
  remove(id: string): Promise<unknown> {
    return apiClient.delete(`/departments/${id}`);
  },
};
