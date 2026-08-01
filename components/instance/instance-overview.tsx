"use client";

import * as React from "react";
import {
  Activity,
  Check,
  Copy,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { formatCompact, formatNumber, maskToken } from "@/lib/utils";
import type {
  InstanceStatus,
  InstanceUsage,
  PlatformInstance,
  ServerInfo,
} from "@/lib/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value ?? "—"}</span>
    </div>
  );
}

/** Token display with reveal + copy, so the credential is visible in the portal. */
function TokenCell({ token }: { token: string }) {
  const [reveal, setReveal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{reveal ? token : maskToken(token)}</span>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? "Hide token" : "Show token"}
      >
        {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={copy}
        aria-label="Copy token"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}

export function InstanceOverview({
  instance,
  usage,
  serverInfo,
  status,
  onRefresh,
}: {
  instance: PlatformInstance;
  usage: InstanceUsage | null;
  serverInfo: ServerInfo | null;
  status: InstanceStatus;
  onRefresh: () => Promise<void> | void;
}) {
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Series (keys)"
          value={formatCompact(usage?.keys ?? 0)}
        />
        <StatCard
          icon={Gauge}
          label="Data points"
          value={formatCompact(usage?.points ?? 0)}
        />
        <StatCard
          icon={Activity}
          label="Reads"
          value={formatNumber(usage?.reads ?? 0)}
        />
        <StatCard
          icon={HardDrive}
          label="Writes"
          value={formatNumber(usage?.writes ?? 0)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4" /> Server status
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="mb-2 flex items-center gap-2">
              <ConnectionStatus status={status} />
              <PlanBadge plan={instance.plan} />
            </div>
            <InfoRow label="HTTP endpoint" value={instance.connectionString} />
            <InfoRow label="TCP endpoint" value={instance.tcpConnectionString} />
            <InfoRow
              label="Credential"
              value={instance.token ? <TokenCell token={instance.token} /> : "—"}
            />
            <InfoRow label="Region" value={instance.region} />
            <InfoRow
              label="Last active"
              value={
                instance.lastActiveAt
                  ? new Date(instance.lastActiveAt).toLocaleString()
                  : "—"
              }
            />
            <InfoRow
              label="Created"
              value={new Date(instance.createdAt).toLocaleDateString()}
            />
            <Separator className="my-2" />
            {serverInfo ? (
              <>
                <InfoRow label="GTSDB version" value={serverInfo.version} />
                <InfoRow
                  label="Uptime"
                  value={
                    serverInfo.uptime_seconds
                      ? `${Math.floor(serverInfo.uptime_seconds / 3600)}h ${
                          Math.floor((serverInfo.uptime_seconds % 3600) / 60)
                        }m`
                      : "—"
                  }
                />
                <InfoRow
                  label="Memory (alloc)"
                  value={
                    serverInfo.memory_alloc_mb
                      ? `${serverInfo.memory_alloc_mb.toFixed(1)} MB`
                      : "—"
                  }
                />
                <InfoRow label="Goroutines" value={serverInfo.goroutines} />
                <InfoRow label="CPU cores" value={serverInfo.num_cpu} />
              </>
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No server telemetry available yet. Try refreshing, or write some
                data to generate usage.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4" /> Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Database className="h-5 w-5 text-primary" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Explore your data</div>
                <div className="text-xs text-muted-foreground">
                  Query series, build charts, write points.
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="#explorer">Open</a>
              </Button>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Server className="h-5 w-5 text-primary" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Connection details</div>
                <div className="text-xs text-muted-foreground">
                  Copy ready-to-use code snippets.
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="#console">View</a>
              </Button>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <MemoryStick className="h-5 w-5 text-primary" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Manage keys</div>
                <div className="text-xs text-muted-foreground">
                  Rename, delete, compact series.
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="#keys">Manage</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

