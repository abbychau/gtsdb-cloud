"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Code2,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Network,
  Settings2,
  Loader2,
} from "lucide-react";
import { useInstance } from "@/hooks/use-instance";
import { adminDeepLink } from "@/lib/utils";
import type { PlatformInstance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { Badge } from "@/components/ui/badge";
import { DataExplorer } from "@/components/instance/data-explorer";
import { InstanceOverview } from "@/components/instance/instance-overview";
import { ApiConsole } from "@/components/instance/api-console";
import { ConnectionPanel } from "@/components/instance/connection-panel";
import { KeysManager } from "@/components/instance/keys-manager";
import { InstanceSettings } from "@/components/instance/instance-settings";
import { EmptyState } from "@/components/dashboard/empty-state";

const TAB_HASHES: Record<string, string> = {
  overview: "#overview",
  explorer: "#explorer",
  console: "#console",
  connection: "#connection",
  keys: "#keys",
  settings: "#settings",
};

export default function InstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { instance, usage, serverInfo, status, loading, error, refresh, updateLocal } =
    useInstance(id);
  const [tab, setTab] = React.useState("overview");

  // Support deep links via URL hash (e.g. #explorer).
  React.useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      for (const [key, h] of Object.entries(TAB_HASHES)) {
        if (hash === h) {
          setTab(key);
          return;
        }
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function changeTab(value: string) {
    setTab(value);
    const h = TAB_HASHES[value];
    if (h && window.location.hash !== h) {
      window.history.replaceState(null, "", h);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={LayoutDashboard}
          title="Instance not found"
          description={error || "This instance may have been deleted."}
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/instances">Back to instances</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/dashboard/instances">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Instances
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              {instance.name}
              <ConnectionStatus status={status} />
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{instance.id}</span>
              <PlanBadge plan={instance.plan} />
              {instance.external && <Badge variant="outline">Self-hosted</Badge>}
              <span className="font-mono text-xs">{instance.connectionString}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={adminDeepLink(instance)} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> gtsdb-admin
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <Loader2 className="mr-1.5 h-3.5 w-3.5" /> Sync usage
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="grid w-full max-w-3xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Explorer</span>
          </TabsTrigger>
          <TabsTrigger value="console" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Console</span>
          </TabsTrigger>
          <TabsTrigger value="connection" className="gap-1.5">
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Connection</span>
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keys</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-4">
            <InstanceOverview
              instance={instance}
              usage={usage}
              serverInfo={serverInfo}
              status={status}
              onRefresh={refresh}
            />
          </TabsContent>
          <TabsContent value="explorer" className="space-y-4">
            <DataExplorer instance={instance} />
          </TabsContent>
          <TabsContent value="console" className="space-y-4">
            <ApiConsole instance={instance} />
          </TabsContent>
          <TabsContent value="connection" className="space-y-4">
            <ConnectionPanel
              instance={instance}
              onChanged={(updated) => {
                updateLocal(updated);
                refresh();
              }}
            />
          </TabsContent>
          <TabsContent value="keys" className="space-y-4">
            <KeysManager instance={instance} />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <InstanceSettings
              instance={instance}
              onChanged={(updated: PlatformInstance) => {
                updateLocal(updated);
                refresh();
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
