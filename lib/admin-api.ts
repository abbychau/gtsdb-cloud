// Client-side API helpers for the admin endpoints (all require an admin token).

import type {
  InstanceStatus,
  PlanId,
  PlatformInstance,
  PlatformUser,
} from "./types";

export interface AdminStats {
  totalUsers: number;
  totalInstances: number;
  activeInstances: number;
  totalPoints: number;
  totalKeys: number;
  totalReads: number;
  totalWrites: number;
  planDistribution: Record<PlanId, number>;
}

export interface AdminUser extends PlatformUser {
  instanceCount: number;
}

export interface AdminInstance extends PlatformInstance {
  ownerEmail?: string | null;
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json
        ? String((json as { error: string }).error)
        : null) || `Request failed (${res.status})`;
    throw new AdminApiError(res.status, message);
  }
  return json as T;
}

// --- Overview --------------------------------------------------------------

export async function getAdminStats(token: string): Promise<AdminStats> {
  return request<AdminStats>("/api/admin/stats", { token });
}

// --- Users ---------------------------------------------------------------

export async function listAdminUsers(token: string): Promise<AdminUser[]> {
  return request<AdminUser[]>("/api/admin/users", { token });
}

export async function setAdminUserPlan(
  uid: string,
  plan: PlanId,
  token: string
): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${uid}`, {
    method: "PATCH",
    body: { plan },
    token,
  });
}

export async function deleteAdminUser(uid: string, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/admin/users/${uid}`, {
    method: "DELETE",
    token,
  });
}

// --- Instances ------------------------------------------------------------

export async function listAdminInstances(token: string): Promise<AdminInstance[]> {
  return request<AdminInstance[]>("/api/admin/instances", { token });
}

export async function updateAdminInstance(
  id: string,
  patch: { plan?: PlanId; status?: InstanceStatus; simulate?: boolean },
  token: string
): Promise<AdminInstance> {
  return request<AdminInstance>(`/api/admin/instances/${id}`, {
    method: "PATCH",
    body: patch,
    token,
  });
}

export async function deleteAdminInstance(
  id: string,
  token: string
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/admin/instances/${id}`, {
    method: "DELETE",
    token,
  });
}
