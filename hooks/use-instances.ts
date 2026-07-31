"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { listInstances } from "@/lib/api";
import type { Plan, PlatformInstance } from "@/lib/types";

/** Shared hook that loads the current user's instances + plan. */
export function useInstances() {
  const { authToken, user } = useAuth();
  const [instances, setInstances] = React.useState<PlatformInstance[]>([]);
  const [plan, setPlan] = React.useState<Plan["id"]>("free");
  const [limits, setLimits] = React.useState<Plan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!authToken || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listInstances(authToken);
      setInstances(res.instances);
      setPlan(res.plan);
      setLimits(res.limits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load instances");
    } finally {
      setLoading(false);
    }
  }, [authToken, user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { instances, plan, limits, loading, error, refresh };
}
