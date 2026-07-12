// ============================================================================
// AssetFlow API Client - Backend Connection
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

export interface ActivityLog {
  id: number;
  event_type: string;
  description: string;
  user_id: [number, string];
  create_date: string;
  asset_id?: [number, string];
}

// ============================================================================
// Utility Functions
// ============================================================================

async function makeRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${baseUrl}${endpoint}`;
    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "include", // Important for session cookies
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Backend returned ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend unavailable",
    };
  }
}

async function makeJsonRpcRequest<T = any>(
  endpoint: string,
  params: any = {}
): Promise<ApiResponse<T>> {
  return makeRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: Date.now() }),
  });
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

export async function signup(email: string, password: string, name?: string): Promise<ApiResponse<{ user_id: number }>> {
  return makeJsonRpcRequest("/assetflow/signup", { email, password, name });
}

export async function login(email: string, password: string): Promise<ApiResponse<User>> {
  return makeJsonRpcRequest("/assetflow/login", { email, password });
}

export async function logout(): Promise<ApiResponse> {
  return makeJsonRpcRequest("/assetflow/logout");
}

export async function checkSession(): Promise<ApiResponse<{ expired: boolean }>> {
  return makeJsonRpcRequest("/assetflow/session");
}

export async function pingSession(): Promise<ApiResponse> {
  return makeJsonRpcRequest("/assetflow/ping_session");
}

// ============================================================================
// Dashboard APIs
// ============================================================================

export async function fetchDashboardKPIs(): Promise<ApiResponse<DashboardKPIs>> {
  // This will call Odoo JSON-RPC to get KPI data
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "kpi.dashboard",
    method: "create",
    args: [{}],
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
    domain.push("|", "|", 
      ["name", "ilike", filters.search],
      ["asset_tag", "ilike", filters.search],
      ["serial_number", "ilike", filters.search]
    );
  }

  return makeJsonRpcRequest("/web/dataset/search_read", {
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

export async function fetchAssetById(id: number): Promise<ApiResponse<Asset>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "asset.asset",
    method: "read",
    args: [[id]],
    kwargs: {},
  });
}

export async function createAsset(asset: Partial<Asset>): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "asset.asset",
    method: "create",
    args: [asset],
    kwargs: {},
  });
}

export async function updateAsset(id: number, updates: Partial<Asset>): Promise<ApiResponse> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "asset.asset",
    method: "write",
    args: [[id], updates],
    kwargs: {},
  });
}

// ============================================================================
// Activity Log APIs
// ============================================================================

export async function fetchActivityLog(limit: number = 50): Promise<ApiResponse<ActivityLog[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "asset.activity.log",
    domain: [],
    fields: ["event_type", "description", "user_id", "create_date", "asset_id"],
    limit,
    sort: "create_date DESC",
  });
}

// ============================================================================
// Department APIs
// ============================================================================

export async function fetchDepartments(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
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
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "asset.booking",
    domain,
    fields: ["asset_id", "booker_id", "start_time", "end_time", "status", "purpose"],
    limit: 100,
    sort: "start_time ASC",
  });
}

export async function createBooking(booking: any): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
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
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "maintenance.request",
    domain: [],
    fields: ["asset_id", "issue_description", "status", "priority", "technician_id", "request_date"],
    limit: 100,
    sort: "request_date DESC",
  });
}

export async function createMaintenanceRequest(request: any): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
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
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "asset.allocation",
    domain: [],
    fields: ["asset_id", "employee_id", "department_id", "status", "allocation_date", "expected_return_date"],
    limit: 100,
    sort: "allocation_date DESC",
  });
}

export async function createAllocation(allocation: any): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
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
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "audit.cycle",
    domain: [],
    fields: ["name", "department_ids", "auditor_ids", "start_date", "end_date", "status"],
    limit: 50,
    sort: "end_date DESC",
  });
}

export async function fetchAuditMarks(cycleId: number): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "audit.mark",
    domain: [["cycle_id", "=", cycleId]],
    fields: ["asset_id", "mark", "notes", "mark_date", "auditor_id"],
    limit: 200,
  });
}

// ============================================================================
// Reports APIs
// ============================================================================

export async function fetchUtilizationReport(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "utilization.report",
    method: "get_department_utilization",
    args: [],
    kwargs: {},
  });
}

export async function fetchMaintenanceReport(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "maintenance.report",
    method: "get_maintenance_trends",
    args: [],
    kwargs: {},
  });
}

// ============================================================================
// New Custom APIs
// ============================================================================

export async function fetchCategories(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "asset.category",
    domain: [],
    fields: ["name", "maintenance_interval_days", "useful_life_years", "active"],
    sort: "name ASC",
  });
}

export async function fetchEmployees(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "hr.employee",
    domain: [],
    fields: ["name", "department_id", "assetflow_role", "active"],
    sort: "name ASC",
  });
}

export async function fetchTransfers(): Promise<ApiResponse<any[]>> {
  return makeJsonRpcRequest("/web/dataset/search_read", {
    model: "asset.transfer",
    domain: [],
    fields: ["asset_id", "current_holder_id", "requested_holder_id", "requester_id", "reason", "status", "request_date"],
    sort: "request_date DESC",
  });
}

export async function createTransfer(transfer: any): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "asset.transfer",
    method: "create",
    args: [transfer],
    kwargs: {},
  });
}

export async function createAuditMark(mark: any): Promise<ApiResponse<{ id: number }>> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "audit.mark",
    method: "create",
    args: [mark],
    kwargs: {},
  });
}

export async function closeAuditCycle(cycleId: number): Promise<ApiResponse> {
  return makeJsonRpcRequest("/web/dataset/call_kw", {
    model: "audit.cycle",
    method: "action_close",
    args: [[cycleId]],
    kwargs: {},
  });
}
