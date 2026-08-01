"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  Globe,
  KeyRound,
  Plus,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useInstances } from "@/hooks/use-instances";
import { getPlan } from "@/lib/plans";
import { formatCompact } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InstanceCard } from "@/components/dashboard/instance-card";
import { CreateInstanceDialog } from "@/components/dashboard/create-instance-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PlanBadge } from "@/components/dashboard/plan-badge";

export default function OverviewPage() {
  const { user } = useAuth();
  const { instances, plan, limits, loading, refresh } = useInstances();

  const totalPoints = instances.reduce((s, i) => s + i.usage.points, 0);
  const totalKeys = instances.reduce((s, i) => s + i.usage.keys, 0);
  const managedCount = instances.filter((i) => !i.external).length;
  const externalCount = instances.length - managedCount;
  const planDef = getPlan(plan);
  const limitProgress = planDef.maxInstances
    ? Math.min(100, (managedCount / planDef.maxInstances) * 100)
    : 0;
  const extLimitProgress = planDef.maxExternalInstances
    ? Math.min(100, (externalCount / planDef.maxExternalInstances) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your timeseries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlanBadge plan={plan} />
          <CreateInstanceDialog
            plan={plan}
            managedCount={managedCount}
            externalCount={externalCount}
            onCreated={() => refresh()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={Database}
          label="Managed instances"
          value={managedCount}
          hint={`${planDef.maxInstances} allowed on ${planDef.name}`}
        />
        <StatCard
          icon={Globe}
          label="Self-hosted"
          value={externalCount}
          hint={`${planDef.maxExternalInstances} allowed on ${planDef.name}`}
        />
        <StatCard
          icon={BarChart3}
          label="Data points"
          value={formatCompact(totalPoints)}
          hint={`${formatCompact(planDef.maxPoints)} storage on ${planDef.name}`}
        />
        <StatCard
          icon={KeyRound}
          label="Series (keys)"
          value={formatCompact(totalKeys)}
          hint="across all instances"
        />
        <StatCard
          icon={Sparkles}
          label="Plan"
          value={planDef.name}
          hint={planDef.priceMonthly === 0 ? "Free forever" : `$${planDef.priceMonthly}/mo`}
        />
      </div>

      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Managed instance quota</span>
          <span className="text-muted-foreground">
            {managedCount} / {planDef.maxInstances}
          </span>
        </div>
        <Progress value={limitProgress} className="mt-3" />
        {limitProgress >= 100 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            You&apos;ve reached your managed instance limit.{" "}
            <Link href="/dashboard/billing" className="text-primary hover:underline">
              Upgrade your plan
            </Link>{" "}
            to create more instances.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Manage your quota and limits from the{" "}
            <Link href="/dashboard/billing" className="text-primary hover:underline">
              Billing
            </Link>{" "}
            page.
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Self-hosted connections</span>
          <span className="text-muted-foreground">
            {externalCount} / {planDef.maxExternalInstances}
          </span>
        </div>
        <Progress value={extLimitProgress} className="mt-3" />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : instances.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No instances yet"
          description="Create your first managed GTSDB instance to start ingesting timeseries data."
          action={
            <CreateInstanceDialog
              plan={plan}
              managedCount={0}
              externalCount={externalCount}
              onCreated={() => refresh()}
            />
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instances.map((inst) => (
            <InstanceCard key={inst.id} instance={inst} onChanged={refresh} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-5">
        <div>
          <h3 className="font-semibold">Just getting started?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Read the 5-minute quickstart to write your first data point.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/docs">
            Read the docs <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
