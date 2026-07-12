/**
 * Shared frontend TypeScript types. Interface placeholders only - fields are
 * expanded alongside feature work in later prompts.
 */

export type Role = 'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'ASSET_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  status: string;
}

export interface Booking {
  id: string;
  assetId: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Maintenance {
  id: string;
  assetId: string;
  status: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Audit {
  id: string;
  cycleId: string;
  status: string;
}

export interface Report {
  id: string;
  type: string;
  generatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Pagination;
}
