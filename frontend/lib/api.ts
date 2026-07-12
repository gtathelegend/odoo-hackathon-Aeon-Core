import { API_BASE_URL } from './api-client';

export interface HealthStatus {
  ok: boolean;
  message: string;
}

/**
 * Check backend connectivity against the AssetFlow API health endpoint.
 * The backend base URL is configured through NEXT_PUBLIC_API_URL.
 */
export async function fetchBackendHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, message: `Backend returned ${response.status}` };
    }
    const data = (await response.json()) as { status: string; service: string };
    return { ok: data.status === 'ok', message: data.service };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Backend unavailable',
    };
  }
}
