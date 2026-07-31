// Client-side API client for the platform backend routes.

import type {
  CreateInstanceInput,
  InstanceUsage,
  PlatformInstance,
  ServerInfo,
  UpdateInstanceInput,
} from "./types";

export class ApiError extends Error {
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
    throw new ApiError(res.status, message);
  }
  return json as T;
}

// --- Instances -------------------------------------------------------------

export interface InstanceListResult {
  instances: PlatformInstance[];
  plan: "free" | "pro" | "team";
  limits: import("./types").Plan;
}

export async function listInstances(token: string): Promise<InstanceListResult> {
  return request<InstanceListResult>("/api/instances", { token });
}

export async function getInstance(
  id: string,
  token: string
): Promise<PlatformInstance> {
  return request<PlatformInstance>(`/api/instances/${id}`, { token });
}

export async function createInstance(
  input: CreateInstanceInput,
  token: string
): Promise<PlatformInstance> {
  return request<PlatformInstance>("/api/instances", {
    method: "POST",
    body: input,
    token,
  });
}

export async function updateInstance(
  id: string,
  input: UpdateInstanceInput,
  token: string
): Promise<PlatformInstance> {
  return request<PlatformInstance>(`/api/instances/${id}`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export async function deleteInstance(id: string, token: string): Promise<void> {
  return request<{ ok: boolean }>(`/api/instances/${id}`, {
    method: "DELETE",
    token,
  }).then(() => undefined);
}

export async function getInstanceUsage(
  id: string,
  token: string
): Promise<{ usage: InstanceUsage; serverInfo: ServerInfo | null; status: string }> {
  return request<{ usage: InstanceUsage; serverInfo: ServerInfo | null; status: string }>(
    `/api/instances/${id}/usage`,
    { token }
  );
}

/** Run a GTSDB operation through the platform proxy. */
export async function proxyOperation<T>(
  id: string,
  op: unknown,
  token: string
): Promise<T> {
  return request<T>(`/api/instances/${id}/proxy`, {
    method: "POST",
    body: op,
    token,
  });
}

// --- Auth ------------------------------------------------------------------

export async function verifySession(token: string): Promise<{ user: unknown }> {
  return request<{ user: unknown }>("/api/auth/verify", {
    method: "POST",
    body: { token },
  });
}
