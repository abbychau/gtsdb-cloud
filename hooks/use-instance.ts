"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { getInstance, getInstanceUsage } from "@/lib/api";
import type { InstanceUsage, PlatformInstance, ServerInfo } from "@/lib/types";

export interface UseInstanceResult {
  instance: PlatformInstance | null;
  usage: InstanceUsage | null;
  serverInfo: ServerInfo | null;
  status: "active" | "offline" | "provisioning" | "suspended";
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateLocal: (patch: Partial<PlatformInstance>) => void;
}

/** Load an instance and refresh its live usage from the connected server. */
export function useInstance(id: string): UseInstanceResult {
  const { authToken } = useAuth();
  const [instance, setInstance] = React.useState<PlatformInstance | null>(null);
  const [usage, setUsage] = React.useState<InstanceUsage | null>(null);
  const [serverInfo, setServerInfo] = React.useState<ServerInfo | null>(null);
  const [status, setStatus] =
    React.useState<UseInstanceResult["status"]>("provisioning");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!authToken || !id) return;
    setLoading(true);
    try {
      const inst = await getInstance(id, authToken);
      setInstance(inst);
      setUsage(inst.usage);
      setStatus(inst.status);
      setError(null);
      try {
        const u = await getInstanceUsage(id, authToken);
        setUsage(u.usage);
        setServerInfo(u.serverInfo);
        setStatus(u.status as UseInstanceResult["status"]);
        setInstance((prev) =>
          prev ? { ...prev, status: u.status as PlatformInstance["status"], usage: u.usage } : prev
        );
      } catch {
        // Keep the cached instance data if the usage probe fails.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load instance");
    } finally {
      setLoading(false);
    }
  }, [id, authToken]);

  const updateLocal = React.useCallback((patch: Partial<PlatformInstance>) => {
    setInstance((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { instance, usage, serverInfo, status, loading, error, refresh, updateLocal };
}
