"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { useInstances } from "@/hooks/use-instances";
import { formatCompact } from "@/lib/utils";
import { Database } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InstanceCard } from "@/components/dashboard/instance-card";
import { CreateInstanceDialog } from "@/components/dashboard/create-instance-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstancesPage() {
  const { instances, plan, loading, refresh } = useInstances();

  const totalPoints = instances.reduce((s, i) => s + i.usage.points, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {instances.length} instance(s) · {formatCompact(totalPoints)} data points
          </p>
        </div>
        <CreateInstanceDialog
          plan={plan}
          instanceCount={instances.length}
          onCreated={refresh}
        />
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
          description="Create your first managed GTSDB instance. It ships with a sandbox simulator so you can explore instantly."
          action={
            <CreateInstanceDialog
              plan={plan}
              instanceCount={0}
              onCreated={refresh}
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
    </div>
  );
}
