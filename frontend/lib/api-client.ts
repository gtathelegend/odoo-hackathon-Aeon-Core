/**
 * Centralized API client for the AssetFlow backend.
 *
 * Every frontend network call goes through this client. The backend base URL
 * is configured exclusively through NEXT_PUBLIC_API_URL. The client:
 *  - reads the access token from the auth store (client only) or an explicit
 *    override, so server components can pass a token from cookies.
 *  - transparently retries once against /auth/refresh on 401 with a valid
 *    refresh token, then replays the original request.
 *  - unwraps the standard { success, message, data } envelope and throws
 *    ApiError for non-2xx responses.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
  code?: string;
  error?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Explicit bearer token — takes precedence over the auth store. */
  token?: string;
  /** Skip auto-refresh on 401 (used by the refresh call itself). */
  skipRefresh?: boolean;
  /** Query parameters. Values are stringified and URL-encoded. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

/** Client-side hook to fetch the current access token without importing zustand here. */
type TokenReader = () => string | null;
let readTokenFromStore: TokenReader = () => null;
export function _bindTokenReader(reader: TokenReader): void {
  readTokenFromStore = reader;
}

/** Hook to trigger auth state clearing on refresh failure. */
let onAuthFailure: () => void = () => {};
export function _bindAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
}

/** Hook to persist rotated tokens back into the auth store. */
let onTokensRotated: (accessToken: string, refreshToken?: string) => void = () => {};
export function _bindTokenRotator(
  handler: (accessToken: string, refreshToken?: string) => void,
): void {
  onTokensRotated = handler;
}

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function doFetch<T>(path: string, options: RequestOptions): Promise<ApiResponse<T>> {
  const { body, token, headers, query, skipRefresh: _skipRefresh, ...rest } = options;
  void _skipRefresh;
  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;
  const resolvedToken = token ?? readTokenFromStore();

  const res = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const err =
      typeof payload === 'object' && payload !== null
        ? (payload as ApiResponse<unknown>)
        : { message: `Request failed with status ${res.status}` };
    throw new ApiError(
      err.message ?? `Request failed with status ${res.status}`,
      res.status,
      (err as { code?: string }).code,
      (err as { error?: unknown }).error,
    );
  }

  return payload as ApiResponse<T>;
}

/** Attempt to refresh tokens using the refresh endpoint. */
async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as ApiResponse<{
      tokens: { accessToken: string; refreshToken: string };
    }>;
    const tokens = payload?.data?.tokens;
    if (!tokens?.accessToken) return null;
    onTokensRotated(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const payload = await doFetch<T>(path, options);
    return payload.data;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipRefresh &&
      !path.startsWith('/auth/')
    ) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const retry = await doFetch<T>(path, { ...options, token: refreshed });
        return retry.data;
      }
      onAuthFailure();
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
  /** Access the full envelope (including pagination meta) when needed. */
  raw: <T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
    doFetch<T>(path, options ?? {}),
};
