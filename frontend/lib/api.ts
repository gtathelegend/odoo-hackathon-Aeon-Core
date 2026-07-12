// ============================================================================
// AssetFlow API Client - Backend Connection
// ============================================================================
//
// Odoo exposes two flavours of endpoints that this client talks to:
//   1. Custom controllers under /assetflow/*  (type="json")
//   2. Standard ORM endpoints /web/dataset/search_read and /web/dataset/call_kw
//
// BOTH wrap their payload in a JSON-RPC 2.0 envelope:
//     success -> { "jsonrpc": "2.0", "id": N, "result": <payload> }
//     failure -> { "jsonrpc": "2.0", "id": N, "error": { message, data: { message } } }
//
// Importantly, Odoo returns HTTP 200 even for business errors (ValidationError,
// AccessError). The transport layer below therefore inspects `error` and unwraps
// `result` so callers get a clean { ok, data, error } shape.
// ============================================================================

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8069";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "asset_manager" | "department_head" | "employee";
}

export interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  serial_number: string;
  category_id: [number, string];
  state: "available" | "allocated" | "reserved" | "under_maintenance" | "lost" | "retired" | "disposed";
  condition: "good" | "fair" | "poor" | "damaged";
  acquisition_date: string;
  acquisition_cost: number;
  location: string;
  department_id?: [number, string];
  current_holder_id?: [number, string];
  is_bookable: boolean;
}

export interface DashboardKPIs {
  assets_available: number;
  assets_allocated: number;
  maintenance_today: number;
  active_bookings: number;
  pending_transfers: number;
  upcoming_returns: number;
  overdue_returns: number;
}

// Normalized activity-log shape consumed by the dashboard and activity pages.
export interface ActivityLog {
  id: number;
  event_type: string;
  description: string;
  user_id?: [number, string];
  create_date: string;
  asset_id?: [number, string];
}

// ============================================================================
// Core transport
// ============================================================================

interface JsonRpcOptions {
  // When true, a { length, records } search_read payload is flattened to records[].
  unwrapRecords?: boolean;
}

async function jsonRpc<T = any>(
  endpoint: string,
  params: Record<string, any> = {},
  { unwrapRecords = false }: JsonRpcOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include", // send Odoo session cookie
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: Date.now() }),
    });

    if (!response.ok) {
      return { ok: false, error: `Backend returned ${response.status}: ${response.statusText}` };
    }

    const envelope = await response.json();

    // JSON-RPC level error (ValidationError, AccessError, etc.) — HTTP is still 200.
    if (envelope?.error) {
      const message =
        envelope.error?.data?.message ||
        envelope.error?.message ||
        "The request could not be completed.";
      return { ok: false, error: message };
    }

    let result = envelope?.result;
    if (unwrapRecords && result && typeof result === "object" && Array.isArray(result.records)) {
      result = result.records;
    }
    return { ok: true, data: result as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend unavailable",
    };
  }
}

// Read helper for /web/dataset/search_read (returns the records array as data).
function searchRead<T = any>(params: Record<string, any>): Promise<ApiResponse<T>> {
  return jsonRpc<T>("/web/dataset/search_read", params, { unwrapRecords: true });
}

// Write/method helper for /web/dataset/call_kw (returns the raw method result).
function callKw<T = any>(params: Record<string, any>): Promise<ApiResponse<T>> {
  return jsonRpc<T>("/web/dataset/call_kw", params);
}

// Custom /assetflow/* controllers return a plain { ok, error, ... } dict inside
// the JSON-RPC result. Normalize so the inner ok/error drives the ApiResponse.
async function authCall<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
  const res = await jsonRpc<any>(endpoint, params);
  if (!res.ok) return res;
  const payload = res.data || {};
  if (payload.ok === false) {
    return { ok: false, error: payload.error || "Request failed.", data: payload };
  }
  return { ok: true, data: payload as T };
}

// ============================================================================
// Health Check
// ============================================================================

export async function fetchBackendHealth(): Promise<ApiResponse<{ service: string }>> {
  try {
    const response = await fetch(`${baseUrl}/assetflow/health`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return { ok: false, error: `Backend returned ${response.status}` };
    }
    const data = await response.json();
    return { ok: true, data, message: data.service };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend unavailable",
    };
  }
}

// ============================================================================
// Authentication APIs
// ============================================================================

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<ApiResponse<{ user_id: number }>> {
  return authCall("/assetflow/signup", { email, password, name });
}

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user_id: number; role: User["role"]; name: string }>> {
  return authCall("/assetflow/login", { email, password });
}

export async function logout(): Promise<ApiResponse> {
  return authCall("/assetflow/logout");
}

export async function checkSession(): Promise<ApiResponse<{ expired: boolean }>> {
  return authCall("/assetflow/session");
}

export async function pingSession(): Promise<ApiResponse> {
  return authCall("/assetflow/ping_session");
}

// ============================================================================
// Dashboard APIs
// ============================================================================

export async function fetchDashboardKPIs(): Promise<ApiResponse<DashboardKPIs>> {
  // kpi.dashboard.get_kpis() computes and returns the 7 metrics as a dict,
  // applying role-based scoping on the server.
  return callKw<DashboardKPIs>({
    model: "kpi.dashboard",
    method: "get_kpis",
    args: [],
    kwargs: {},
  });
}

// ============================================================================
// Asset APIs
// ============================================================================

export async function fetchAssets(filters?: {
  state?: string;
  category?: string;
  search?: string;
}): Promise<ApiResponse<Asset[]>> {
  const domain: any[] = [];
  if (filters?.state) domain.push(["state", "=", filters.state]);
  if (filters?.category) domain.push(["category_id", "=", parseInt(filters.category)]);
  if (filters?.search) {
    // Case-insensitive substring match across tag / name / serial (Requirement 8.2).
    domain.push(
      "|",
      "|",
      ["name", "ilike", filters.search],
      ["asset_tag", "ilike", filters.search],
      ["serial_number", "ilike", filters.search]
    );
  }

  return searchRead<Asset[]>({
    model: "asset.asset",
    domain,
    fields: [
      "name",
      "asset_tag",
      "serial_number",
      "category_id",
      "state",
      "condition",
      "location",
      "department_id",
      "current_holder_id",
      "is_bookable",
    ],
    limit: 100,
    sort: "asset_tag ASC",
  });
}

export async function fetchAssetById(id: number): Promise<ApiResponse<Asset[]>> {
  return callKw<Asset[]>({
    model: "asset.asset",
    method: "read",
    args: [[id]],
    kwargs: {},
  });
}

export async function createAsset(asset: Partial<Asset>): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "asset.asset",
    method: "create",
    args: [asset],
    kwargs: {},
  });
}

export async function updateAsset(id: number, updates: Partial<Asset>): Promise<ApiResponse> {
  return callKw({
    model: "asset.asset",
    method: "write",
    args: [[id], updates],
    kwargs: {},
  });
}

// ============================================================================
// Activity Log APIs
// ============================================================================

function buildActivityDescription(row: any): string {
  const action = (row.action_type || "event").replace(/_/g, " ");
  const prev = row.previous_state;
  const next = row.new_state;
  if (prev && next) return `${action} (${prev} → ${next})`;
  if (next) return `${action} → ${next}`;
  return action;
}

export async function fetchActivityLog(limit: number = 50): Promise<ApiResponse<ActivityLog[]>> {
  const res = await searchRead<any[]>({
    model: "asset.activity.log",
    domain: [],
    fields: ["actor_id", "action_type", "target_model", "target_res_id", "previous_state", "new_state", "occurred_at"],
    limit,
    sort: "occurred_at DESC",
  });

  if (!res.ok) return res as ApiResponse<ActivityLog[]>;

  // Map the real activity-log schema onto the shape the UI expects.
  const normalized: ActivityLog[] = (res.data || []).map((row: any) => ({
    id: row.id,
    event_type: row.action_type || "",
    description: buildActivityDescription(row),
    user_id: row.actor_id || undefined,
    create_date: row.occurred_at,
    // asset_id name is not available from a flat search_read, so it is left
    // undefined; the UI falls back to a generic system entry in that case.
    asset_id: undefined,
  }));

  return { ok: true, data: normalized };
}

// ============================================================================
// Department APIs
// ============================================================================

export async function fetchDepartments(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "hr.department",
    domain: [],
    fields: ["name", "parent_id", "manager_id", "member_ids"],
    sort: "name ASC",
  });
}

// ============================================================================
// Booking APIs
// ============================================================================

export async function fetchBookings(date?: string): Promise<ApiResponse<any[]>> {
  const domain = date ? [["start_time", ">=", date]] : [];
  return searchRead({
    model: "asset.booking",
    domain,
    fields: ["asset_id", "booker_id", "start_time", "end_time", "status", "purpose"],
    limit: 100,
    sort: "start_time ASC",
  });
}

export async function createBooking(booking: any): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "asset.booking",
    method: "create",
    args: [booking],
    kwargs: {},
  });
}

// ============================================================================
// Maintenance APIs
// ============================================================================

export async function fetchMaintenanceRequests(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "maintenance.request",
    domain: [],
    fields: ["asset_id", "issue_description", "status", "priority", "technician_id", "request_date"],
    limit: 100,
    sort: "request_date DESC",
  });
}

export async function createMaintenanceRequest(request: any): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "maintenance.request",
    method: "create",
    args: [request],
    kwargs: {},
  });
}

// ============================================================================
// Allocation APIs
// ============================================================================

export async function fetchAllocations(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "asset.allocation",
    domain: [],
    fields: ["asset_id", "employee_id", "department_id", "status", "allocation_date", "expected_return_date"],
    limit: 100,
    sort: "allocation_date DESC",
  });
}

export async function createAllocation(allocation: any): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "asset.allocation",
    method: "create",
    args: [allocation],
    kwargs: {},
  });
}

// ============================================================================
// Audit APIs
// ============================================================================

export async function fetchAuditCycles(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "audit.cycle",
    domain: [],
    fields: [
      "name",
      "scope_type",
      "department_ids",
      "location",
      "auditor_ids",
      "start_date",
      "end_date",
      "status",
      "discrepancy_report",
    ],
    limit: 50,
    sort: "end_date DESC",
  });
}

export async function fetchAuditMarks(cycleId: number): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "audit.mark",
    domain: [["cycle_id", "=", cycleId]],
    fields: ["asset_id", "mark", "notes", "mark_date", "auditor_id"],
    limit: 200,
  });
}

export async function createAuditMark(mark: any): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "audit.mark",
    method: "create",
    args: [mark],
    kwargs: {},
  });
}

export async function closeAuditCycle(cycleId: number): Promise<ApiResponse> {
  return callKw({
    model: "audit.cycle",
    method: "action_close",
    args: [[cycleId]],
    kwargs: {},
  });
}

// ============================================================================
// Reports APIs
// ============================================================================

export async function fetchUtilizationReport(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any[]>> {
  const to = dateTo || new Date().toISOString().split("T")[0];
  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return callKw({
    model: "report.assetflow_erp.utilization_service",
    method: "get_report_data",
    args: [from, to],
    kwargs: {},
  });
}

export async function fetchMaintenanceReport(): Promise<ApiResponse<any[]>> {
  return callKw({
    model: "report.assetflow_erp.maintenance_service",
    method: "get_due_for_maintenance",
    args: [],
    kwargs: {},
  });
}

// ============================================================================
// Category / Employee / Transfer APIs
// ============================================================================

export async function fetchCategories(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "asset.category",
    domain: [],
    fields: ["name", "maintenance_interval_days", "useful_life_years", "active"],
    sort: "name ASC",
  });
}

export async function fetchEmployees(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "hr.employee",
    domain: [],
    fields: ["name", "department_id", "assetflow_role", "active"],
    sort: "name ASC",
  });
}

export async function fetchTransfers(): Promise<ApiResponse<any[]>> {
  return searchRead({
    model: "asset.transfer",
    domain: [],
    fields: [
      "asset_id",
      "current_holder_id",
      "requested_holder_id",
      "requester_id",
      "reason",
      "status",
      "request_date",
    ],
    sort: "request_date DESC",
  });
}

export async function createTransfer(transfer: any): Promise<ApiResponse<number>> {
  return callKw<number>({
    model: "asset.transfer",
    method: "create",
    args: [transfer],
    kwargs: {},
  });
}
