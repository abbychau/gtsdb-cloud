// Helpers to talk to a real GTSDB server from the platform backend.

import { getAdminToken, getGtsdbBase } from "./gtsdb-config";

export interface GtsdbCallResult {
  ok: boolean;
  status: number;
  data: unknown;
}

export type ProvisionResult =
  | { ok: true; name: string; token: string }
  | { ok: false; error: string };

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message: unknown }).message || fallback);
  }
  return fallback;
}

/**
 * Provision a tenant namespace on the shared GTSDB server using `adduser`.
 * If the user already exists, rotates its token with `resetkey` instead.
 * GTSDB is multi-tenant: the returned token scopes every request to that
 * namespace, so each platform instance is isolated on the shared server.
 */
export async function provisionGtsdbUser(username: string): Promise<ProvisionResult> {
  const admin = getAdminToken();
  if (!admin) return { ok: false, error: "GTSDB_ADMIN_TOKEN is not configured" };
  const base = getGtsdbBase();

  const created = await callGtsdb(base, admin, { operation: "adduser", key: username });
  const createdData = created.data as {
    success?: boolean;
    data?: { name?: string; token?: string };
    message?: string;
  };
  if (created.ok && createdData.success && createdData.data?.token) {
    return { ok: true, name: username, token: createdData.data.token };
  }

  const addError = extractMessage(created.data, "adduser failed");
  if (addError.toLowerCase().includes("already exists")) {
    const reset = await callGtsdb(base, admin, { operation: "resetkey", key: username });
    const resetData = reset.data as {
      success?: boolean;
      data?: { token?: string };
      message?: string;
    };
    if (reset.ok && resetData.success && resetData.data?.token) {
      return { ok: true, name: username, token: resetData.data.token };
    }
    return { ok: false, error: extractMessage(reset.data, "resetkey failed") };
  }
  return { ok: false, error: addError };
}

/** Rotate a tenant's token on the shared server (invalidates the old one). */
export async function rotateGtsdbUserToken(username: string): Promise<ProvisionResult> {
  const admin = getAdminToken();
  if (!admin) return { ok: false, error: "GTSDB_ADMIN_TOKEN is not configured" };
  const reset = await callGtsdb(getGtsdbBase(), admin, {
    operation: "resetkey",
    key: username,
  });
  const data = reset.data as { success?: boolean; data?: { token?: string }; message?: string };
  if (reset.ok && data.success && data.data?.token) {
    return { ok: true, name: username, token: data.data.token };
  }
  return { ok: false, error: extractMessage(reset.data, "resetkey failed") };
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
