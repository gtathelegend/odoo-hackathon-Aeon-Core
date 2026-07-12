/**
 * AssetFlow API helpers
 * Wraps apiClient calls into the { ok, data, error } shape that the
 * kartik-branch pages expect, mapping to the Express REST backend.
 */

import { apiClient, ApiError, API_BASE_URL } from './api-client';

// ─── Shared response shape ────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail(error: unknown): ApiResponse<never> {
  if (error instanceof ApiError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: 'Unknown error' };
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthStatus {
  ok: boolean;
  message: string;
}

export async function fetchBackendHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, message: `Backend returned ${res.status}` };
    const data = (await res.json()) as { status: string; service: string };
    return { ok: data.status === 'ok', message: data.service };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Backend unavailable' };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/auth/login', { email, password });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function signup(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/auth/register', {
      email,
      password,
      firstName: firstName ?? email.split('@')[0],
      lastName: lastName ?? '',
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function logout(): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/auth/logout');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function refreshToken(): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/auth/refresh');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function fetchDashboardKPIs(): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.get<any>('/dashboard');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function fetchAssets(filters?: {
  search?: string;
  state?: string;
  category?: string;
}): Promise<ApiResponse<any[]>> {
  try {
    const query: Record<string, string> = {};
    if (filters?.search) query.search = filters.search;
    if (filters?.state) query.status = filters.state;          // backend uses "status"
    if (filters?.category) query.categoryId = filters.category;

    const data = await apiClient.get<any>('/assets', { query });
    // backend returns { items, total, page, pageSize } or plain array
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function fetchAssetById(id: string | number): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.get<any>(`/assets/${id}`);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function createAsset(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/assets', payload);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function updateAsset(id: string | number, payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.put<any>(`/assets/${id}`, payload);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Allocations ──────────────────────────────────────────────────────────────

export async function fetchAllocations(filters?: {
  assetId?: string;
  status?: string;
}): Promise<ApiResponse<any[]>> {
  try {
    const query: Record<string, string> = {};
    if (filters?.assetId) query.assetId = filters.assetId;
    if (filters?.status) query.status = filters.status;

    const data = await apiClient.get<any>('/allocations', { query });
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function createAllocation(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/allocations', payload);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function fetchTransfers(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/assets');
    return ok([]);          // transfers are per-asset; return empty for global view
  } catch (e) {
    return fail(e);
  }
}

export async function createTransfer(payload: any): Promise<ApiResponse<any>> {
  try {
    // POST /assets/:id/transfers
    const assetId = payload.asset_id;
    const data = await apiClient.post<any>(`/assets/${assetId}/transfers`, {
      toEmployeeId: payload.requested_holder_id,
      reason: payload.reason,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function fetchBookings(date?: string): Promise<ApiResponse<any[]>> {
  try {
    const query: Record<string, string> = {};
    if (date) query.date = date;

    const data = await apiClient.get<any>('/bookings', { query });
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function createBooking(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/bookings', {
      assetId: payload.asset_id,
      employeeId: payload.booker_id,
      startTime: payload.start_time,
      endTime: payload.end_time,
      purpose: payload.purpose,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function fetchMaintenanceRequests(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/maintenance');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function createMaintenanceRequest(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/maintenance', {
      assetId: payload.asset_id,
      priority: (payload.priority ?? 'MEDIUM').toUpperCase(),
      description: payload.issue_description,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function fetchAuditCycles(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/audit');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function fetchAuditMarks(cycleId: number | string): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>(`/audit/${cycleId}`);
    // return records array if present
    const items: any[] = data?.records ?? data?.auditRecords ?? [];
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

export async function createAuditMark(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>(`/audit/${payload.cycle_id}/records`, {
      assetId: payload.asset_id,
      status: payload.mark?.toUpperCase(),
      note: payload.notes,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function closeAuditCycle(cycleId: number | string): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.put<any>(`/audit/${cycleId}`, { status: 'CLOSED' });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function fetchDepartments(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/departments');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

// ─── Employees / Users ────────────────────────────────────────────────────────

export async function fetchEmployees(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/users');
    const raw: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    // Normalise to the shape kartik pages expect (name, department_id, active)
    const items = raw.map((u: any) => ({
      ...u,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      active: u.isActive ?? true,
      department_id: u.employee?.department
        ? [u.employee.department.id, u.employee.department.name]
        : null,
    }));
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function fetchActivityLog(limit = 50): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/users/activity', {
      query: { limit: limit.toString() },
    });
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    // activity log endpoint may not exist yet — return empty gracefully
    return ok([]);
  }
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function fetchUtilizationReport(): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.get<any>('/reports');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

export async function fetchMaintenanceReport(): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.get<any>('/reports/maintenance');
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/asset-categories');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}
