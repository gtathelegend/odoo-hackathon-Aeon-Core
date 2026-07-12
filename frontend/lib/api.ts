const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8069";

export async function fetchBackendHealth() {
  try {
    const response = await fetch(`${baseUrl}/assetflow/health`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return { ok: false, message: `Backend returned ${response.status}` };
    }
    const data = (await response.json()) as { ok: boolean; service: string };
    return { ok: data.ok, message: data.service };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Backend unavailable",
    };
  }
}
