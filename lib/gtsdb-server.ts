// Helpers to talk to a real GTSDB server from the platform backend.

export interface GtsdbCallResult {
  ok: boolean;
  status: number;
  data: unknown;
}

function normalizeEndpoint(endpoint: string): string {
  let e = (endpoint || "").trim().replace(/\/+$/, "");
  if (!e) return "";
  if (!/^https?:\/\//i.test(e)) e = `http://${e}`;
  return e;
}

/** GET the GTSDB health endpoint. Returns true when the server is reachable. */
export async function checkHealth(
  endpoint: string,
  timeoutMs = 3000
): Promise<boolean> {
  const base = normalizeEndpoint(endpoint);
  if (!base) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${base}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** POST a GTSDB operation to `{endpoint}/` with the instance token. */
export async function callGtsdb(
  endpoint: string,
  token: string,
  body: unknown,
  timeoutMs = 15000
): Promise<GtsdbCallResult> {
  const base = normalizeEndpoint(endpoint);
  if (!base) {
    return { ok: false, status: 0, data: { success: false, message: "No endpoint configured" } };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({ success: false, message: "Invalid response" }));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message:
          err instanceof Error && err.name === "AbortError"
            ? "Request timed out"
            : `Connection failed: ${err instanceof Error ? err.message : "unknown error"}`,
      },
    };
  }
}
