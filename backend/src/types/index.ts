/**
 * Shared TypeScript types for the AssetFlow API foundation.
 * These are interface placeholders only - concrete domain fields are added
 * in later prompts alongside the Prisma schema.
 */

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  ASSET_MANAGER = 'ASSET_MANAGER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  isActive: boolean;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  categoryId?: string;
  status: string;
}

export interface Booking {
  id: string;
  assetId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Maintenance {
  id: string;
  assetId: string;
  requestedById: string;
  status: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Audit {
  id: string;
  cycleId: string;
  assetId: string;
  status: string;
}

export interface Report {
  id: string;
  type: string;
  generatedAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: unknown;
}
