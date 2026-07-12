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

// ─── ID Mapping Helpers ────────────────────────────────────────────────────────

const uuidToIdMap = new Map<string, number>();
const idToUuidMap = new Map<number, string>();
let nextNumericId = 1;

export function toNumericId(uuid: any): number {
  if (typeof uuid !== 'string') return uuid;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return uuid as any;
  }
  let numId = uuidToIdMap.get(uuid);
  if (numId === undefined) {
    numId = nextNumericId++;
    uuidToIdMap.set(uuid, numId);
    idToUuidMap.set(numId, uuid);
  }
  return numId;
}

export function toUuid(numId: any): string {
  if (typeof numId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(numId)) {
    return numId;
  }
  if (typeof numId !== 'number') return numId;
  return idToUuidMap.get(numId) || String(numId);
}

function formatToOdooDate(isoDateString: any): string {
  if (!isoDateString) return '';
  const d = new Date(isoDateString);
  if (isNaN(d.getTime())) return String(isoDateString);
  
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export function translatePayloadToBackend(payload: any): any {
  if (!payload) return payload;
  if (Array.isArray(payload)) {
    return payload.map(translatePayloadToBackend);
  }
  if (typeof payload === 'object') {
    const next: any = {};
    for (const [key, val] of Object.entries(payload)) {
      if ((key.toLowerCase().endsWith('id') || key.toLowerCase().endsWith('_id')) && typeof val === 'number') {
        next[key] = toUuid(val);
      } else {
        next[key] = translatePayloadToBackend(val);
      }
    }
    return next;
  }
  return payload;
}

export function mapAssetToFrontend(a: any): any {
  if (!a) return a;
  
  let state = 'available';
  if (a.status) {
    const s = String(a.status).toUpperCase();
    if (s === 'MAINTENANCE') {
      state = 'under_maintenance';
    } else {
      state = s.toLowerCase();
    }
  }

  let category_id = null;
  if (a.category) {
    category_id = [toNumericId(a.category.id), a.category.name];
  } else if (a.categoryId) {
    category_id = [toNumericId(a.categoryId), 'Category'];
  }

  let location = '--';
  if (a.location) {
    location = a.location.name || a.location.code || '--';
  } else if (a.locationId) {
    location = 'Location';
  }

  return {
    ...a,
    id: toNumericId(a.id),
    asset_tag: a.assetTag || '',
    serial_number: a.serialNumber || '',
    state,
    category_id,
    location,
    categoryId: a.categoryId ? toNumericId(a.categoryId) : null,
    locationId: a.locationId ? toNumericId(a.locationId) : null,
    departmentId: a.departmentId ? toNumericId(a.departmentId) : null,
    department_id: a.department ? [toNumericId(a.department.id), a.department.name] : null,
  };
}

export function mapAllocationToFrontend(a: any): any {
  if (!a) return a;
  return {
    ...a,
    id: toNumericId(a.id),
    status: (a.status || '').toLowerCase(),
    asset_id: a.asset ? [toNumericId(a.asset.id), `[${a.asset.assetTag}] ${a.asset.name}`] : (a.assetId ? [toNumericId(a.assetId), 'Asset'] : null),
    employee_id: a.employee ? [toNumericId(a.employee.id), `${a.employee.user?.firstName ?? ''} ${a.employee.user?.lastName ?? ''}`.trim() || 'Employee'] : (a.employeeId ? [toNumericId(a.employeeId), 'Employee'] : null),
    department_id: a.employee?.department ? [toNumericId(a.employee.department.id), a.employee.department.name] : null,
  };
}

export function mapBookingToFrontend(b: any): any {
  if (!b) return b;
  return {
    ...b,
    id: toNumericId(b.id),
    start_time: formatToOdooDate(b.startTime),
    end_time: formatToOdooDate(b.endTime),
    booker_id: b.employee ? [toNumericId(b.employee.id), `${b.employee.user?.firstName ?? ''} ${b.employee.user?.lastName ?? ''}`.trim() || 'Employee'] : (b.employeeId ? [toNumericId(b.employeeId), 'Employee'] : null),
    asset_id: b.asset ? [toNumericId(b.asset.id), `[${b.asset.assetTag}] ${b.asset.name}`] : (b.assetId ? [toNumericId(b.assetId), 'Asset'] : null),
  };
}

export function mapMaintenanceToFrontend(r: any): any {
  if (!r) return r;
  let status = 'pending';
  const s = (r.status || '').toUpperCase();
  if (s === 'PENDING') status = 'pending';
  else if (s === 'ASSIGNED') status = 'technician_assigned';
  else if (s === 'IN_PROGRESS') status = 'in_progress';
  else if (s === 'RESOLVED') status = 'resolved';
  else if (s === 'REJECTED') status = 'rejected';
  else if (s === 'CANCELLED') status = 'cancelled';

  const priority = (r.priority || 'medium').toLowerCase();

  let technician_id = null;
  if (r.assignments && r.assignments.length > 0) {
    const latest = r.assignments[0];
    if (latest && latest.technicianId) {
      technician_id = [toNumericId(latest.technicianId), latest.technicianName || 'Technician'];
    }
  }

  return {
    ...r,
    id: toNumericId(r.id),
    status,
    priority,
    issue_description: r.description || '',
    request_date: formatToOdooDate(r.createdAt),
    asset_id: r.asset ? [toNumericId(r.asset.id), `[${r.asset.assetTag}] ${r.asset.name}`] : (r.assetId ? [toNumericId(r.assetId), 'Asset'] : null),
    technician_id,
  };
}

export function mapAuditCycleToFrontend(c: any): any {
  if (!c) return c;
  let status = 'draft';
  const s = (c.status || '').toUpperCase();
  if (s === 'PLANNED') status = 'draft';
  else if (s === 'IN_PROGRESS') status = 'in_progress';
  else if (s === 'CLOSED' || s === 'COMPLETED') status = 'closed';
  
  let department_ids: number[] = [];
  if (c.departments) {
    department_ids = c.departments.map((d: any) => toNumericId(d.id));
  } else if (c.departmentIds) {
    department_ids = c.departmentIds.map((id: any) => toNumericId(id));
  }

  return {
    ...c,
    id: toNumericId(c.id),
    status,
    scope_type: (c.scopeType || 'all').toLowerCase(),
    department_ids,
    location: c.location?.name || c.location || '',
  };
}

export function mapAuditMarkToFrontend(m: any): any {
  if (!m) return m;
  const mark = (m.status || 'verified').toLowerCase();
  
  return {
    ...m,
    id: toNumericId(m.id),
    asset_id: m.asset ? [toNumericId(m.asset.id), `[${m.asset.assetTag}] ${m.asset.name}`] : (m.assetId ? [toNumericId(m.assetId), 'Asset'] : null),
    mark,
    notes: m.note || '',
  };
}

export function mapActivityToFrontend(act: any): any {
  if (!act) return act;
  return {
    ...act,
    id: toNumericId(act.id),
    asset_id: act.asset ? [toNumericId(act.asset.id), `[${act.asset.assetTag}] ${act.asset.name}`] : (act.assetId ? [toNumericId(act.assetId), 'Asset'] : null),
  };
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function fetchAssets(filters?: {
  search?: string;
  state?: string;
  category?: string | number;
}): Promise<ApiResponse<any[]>> {
  try {
    const query: Record<string, string> = {};
    if (filters?.search) query.search = filters.search;
    if (filters?.state) {
      const map: Record<string, string> = {
        available: 'AVAILABLE',
        allocated: 'ALLOCATED',
        reserved: 'RESERVED',
        under_maintenance: 'MAINTENANCE',
        lost: 'LOST',
        retired: 'RETIRED',
        disposed: 'DISPOSED',
      };
      query.status = map[filters.state] || filters.state;
    }
    if (filters?.category) {
      query.categoryId = toUuid(filters.category);
    }

    const data = await apiClient.get<any>('/assets', { query });
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items.map(mapAssetToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function fetchAssetById(id: string | number): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.get<any>(`/assets/${toUuid(id)}`);
    return ok(mapAssetToFrontend(data?.asset ?? data));
  } catch (e) {
    return fail(e);
  }
}

export async function createAsset(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/assets', translatePayloadToBackend(payload));
    return ok(mapAssetToFrontend(data));
  } catch (e) {
    return fail(e);
  }
}

export async function updateAsset(id: string | number, payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.put<any>(`/assets/${toUuid(id)}`, translatePayloadToBackend(payload));
    return ok(mapAssetToFrontend(data));
  } catch (e) {
    return fail(e);
  }
}

// ─── Allocations ──────────────────────────────────────────────────────────────

export async function fetchAllocations(filters?: {
  assetId?: string | number;
  status?: string;
}): Promise<ApiResponse<any[]>> {
  try {
    const query: Record<string, string> = {};
    if (filters?.assetId) query.assetId = toUuid(filters.assetId);
    if (filters?.status) query.status = filters.status.toUpperCase();

    const data = await apiClient.get<any>('/allocations', { query });
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items.map(mapAllocationToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function createAllocation(payload: any): Promise<ApiResponse<any>> {
  try {
    let employeeId = payload.employee_id;
    if (payload.holder_type === 'department') {
      const deptIdUuid = toUuid(payload.department_id);
      const empRes = await fetchEmployees();
      if (empRes.ok && empRes.data) {
        const inDept = empRes.data.filter((e: any) => e.employee?.departmentId === deptIdUuid || (e.department_id && e.department_id[0] === payload.department_id));
        const head = inDept.find((e: any) => e.role === 'DEPARTMENT_HEAD');
        const chosen = head || inDept[0];
        if (chosen) {
          employeeId = chosen.id;
        } else {
          return { ok: false, error: 'No active employees found in selected department.' };
        }
      } else {
        return { ok: false, error: 'Could not fetch employees for department allocation.' };
      }
    }

    const data = await apiClient.post<any>('/allocations', {
      assetId: toUuid(payload.asset_id),
      employeeId: toUuid(employeeId),
      expectedReturnDate: payload.expected_return_date ? new Date(payload.expected_return_date).toISOString() : undefined,
    });
    return ok(mapAllocationToFrontend(data));
  } catch (e) {
    return fail(e);
  }
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function fetchTransfers(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/assets');
    return ok([]);
  } catch (e) {
    return fail(e);
  }
}

export async function createTransfer(payload: any): Promise<ApiResponse<any>> {
  try {
    const assetId = toUuid(payload.asset_id);
    const data = await apiClient.post<any>(`/assets/${assetId}/transfers`, {
      toEmployeeId: toUuid(payload.requested_holder_id),
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
    return ok(items.map(mapBookingToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function createBooking(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/bookings', {
      assetId: toUuid(payload.asset_id),
      employeeId: toUuid(payload.booker_id),
      startTime: payload.start_time ? new Date(payload.start_time).toISOString() : undefined,
      endTime: payload.end_time ? new Date(payload.end_time).toISOString() : undefined,
      purpose: payload.purpose,
    });
    return ok(mapBookingToFrontend(data));
  } catch (e) {
    return fail(e);
  }
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function fetchMaintenanceRequests(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/maintenance');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items.map(mapMaintenanceToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function createMaintenanceRequest(payload: any): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.post<any>('/maintenance', {
      assetId: toUuid(payload.asset_id),
      priority: (payload.priority ?? 'MEDIUM').toUpperCase(),
      description: payload.issue_description,
    });
    return ok(mapMaintenanceToFrontend(data));
  } catch (e) {
    return fail(e);
  }
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function fetchAuditCycles(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/audit');
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return ok(items.map(mapAuditCycleToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function fetchAuditMarks(cycleId: number | string): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>(`/audit/${toUuid(cycleId)}`);
    const items: any[] = data?.records ?? data?.auditRecords ?? [];
    return ok(items.map(mapAuditMarkToFrontend));
  } catch (e) {
    return fail(e);
  }
}

export async function createAuditMark(payload: any): Promise<ApiResponse<any>> {
  try {
    const cycleUuid = toUuid(payload.cycle_id);
    const assetUuid = toUuid(payload.asset_id);
    
    const record = await apiClient.post<any>(`/audit/${cycleUuid}/records`, {
      assetId: assetUuid,
    });
    
    if (!record || !record.id) {
      return { ok: false, error: 'Failed to create or retrieve audit record.' };
    }
    
    let condition = 'GOOD';
    try {
      const asset = await apiClient.get<any>(`/assets/${assetUuid}`);
      if (asset && asset.condition) {
        condition = asset.condition;
      }
    } catch (e) {
      console.warn('Failed to fetch asset condition, falling back to GOOD:', e);
    }
    
    const isVerified = payload.mark?.toLowerCase() === 'verified';
    const markRes = await apiClient.post<any>(`/audit/${cycleUuid}/records/${record.id}/verify`, {
      isVerified,
      foundCondition: condition,
      note: payload.notes || undefined,
    });
    
    return ok(mapAuditMarkToFrontend(markRes));
  } catch (e) {
    return fail(e);
  }
}

export async function closeAuditCycle(cycleId: number | string): Promise<ApiResponse<any>> {
  try {
    const data = await apiClient.patch<any>(`/audit/${toUuid(cycleId)}`, { status: 'CLOSED' });
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
    const mapped = items.map((d: any) => ({
      ...d,
      id: toNumericId(d.id),
      parentId: d.parentId ? toNumericId(d.parentId) : null,
    }));
    return ok(mapped);
  } catch (e) {
    return fail(e);
  }
}

// ─── Employees / Users ────────────────────────────────────────────────────────

export async function fetchEmployees(): Promise<ApiResponse<any[]>> {
  try {
    const data = await apiClient.get<any>('/users');
    const raw: any[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    const items = raw.map((u: any) => {
      const empId = u.employee?.id || u.id;
      return {
        ...u,
        id: toNumericId(empId),
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        active: u.isActive ?? true,
        department_id: u.employee?.department
          ? [toNumericId(u.employee.department.id), u.employee.department.name]
          : null,
      };
    });
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
    return ok(items.map(mapActivityToFrontend));
  } catch (e) {
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
    const mapped = items.map((c: any) => ({
      ...c,
      id: toNumericId(c.id),
      parentId: c.parentId ? toNumericId(c.parentId) : null,
    }));
    return ok(mapped);
  } catch (e) {
    return fail(e);
  }
}
