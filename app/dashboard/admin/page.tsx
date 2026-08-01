"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Archive,
  Boxes,
  Cpu,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isAdminEmail } from "@/lib/admin";
import { getPlan, PLAN_ORDER } from "@/lib/plans";
import { formatBytes, formatCompact, formatNumber } from "@/lib/utils";
import {
  adminStripeSubscriptionAction,
  createBackup,
  deleteAdminInstance,
  deleteAdminUser,
  deleteBackup,
  downloadBackup,
  getAdminMonitor,
  getAdminStats,
  getStripeCustomers,
  getStripeEvents,
  listAdminInstances,
  listAdminUsers,
  listBackups,
  restoreBackup,
  setAdminUserPlan,
  updateAdminInstance,
  type AdminInstance,
  type AdminMonitor,
  type AdminStats,
  type AdminUser,
  type BackupInfo,
  type StripeCustomerRow,
  type StripeEvent,
} from "@/lib/admin-api";
import type { InstanceStatus, PlanId } from "@/lib/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE: Record<InstanceStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  provisioning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  offline: "bg-muted text-muted-foreground",
  suspended: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value ?? "—"}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function PlanSelect({
  value,
  onChange,
  disabled,
}: {
  value: PlanId;
  onChange: (plan: PlanId) => Promise<void> | void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(v as PlanId)}
    >
      <SelectTrigger className="h-7 w-24 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLAN_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            {getPlan(p).name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeleteButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await onConfirm();
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminPage() {
  const { user, authToken } = useAuth();
  const token = authToken || "";

  const [tab, setTab] = React.useState("overview");
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [instances, setInstances] = React.useState<AdminInstance[]>([]);
  const [monitor, setMonitor] = React.useState<AdminMonitor | null>(null);
  const [backups, setBackups] = React.useState<BackupInfo[]>([]);
  const [backingUp, setBackingUp] = React.useState(false);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const [stripeEvents, setStripeEvents] = React.useState<StripeEvent[]>([]);
  const [stripeCustomers, setStripeCustomers] = React.useState<StripeCustomerRow[]>([]);
  const [stripeEnabled, setStripeEnabled] = React.useState(false);
  const [stripeBusy, setStripeBusy] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const isAdmin = isAdminEmail(user?.email);

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const [s, u, i, m, b, se, sc] = await Promise.all([
        getAdminStats(token),
        listAdminUsers(token),
        listAdminInstances(token),
        getAdminMonitor(token),
        listBackups(token),
        getStripeEvents(token),
        getStripeCustomers(token),
      ]);
      setStats(s);
      setUsers(u);
      setInstances(i);
      setMonitor(m);
      setBackups(b);
      setStripeEvents(se.events ?? []);
      setStripeCustomers(sc.customers ?? []);
      setStripeEnabled(se.enabled && sc.enabled);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (isAdmin && token) void load();
  }, [isAdmin, token, load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={ShieldCheck}
          title="Admin access required"
          description="This area is restricted to platform administrators."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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

  const planTotal = Math.max(
    1,
    Object.values(stats?.planDistribution ?? {}).reduce((a, b) => a + b, 0)
  );

  async function changeUserPlan(uid: string, plan: PlanId) {
    try {
      const updated = await setAdminUserPlan(uid, plan, token);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...updated } : u)));
      setStats(null); // force overview refresh
      toast.success("Plan updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    }
  }

  async function removeUser(uid: string, email: string) {
    try {
      await deleteAdminUser(uid, token);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setInstances((prev) => prev.filter((i) => i.ownerUid !== uid));
      setStats(null);
      toast.success(`Deleted ${email || "user"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function changeInstance(id: string, patch: { plan?: PlanId; status?: InstanceStatus }) {
    try {
      const updated = await updateAdminInstance(id, patch, token);
      setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
      setStats(null);
      toast.success("Instance updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update instance");
    }
  }

  async function removeInstance(id: string, name: string) {
    try {
      await deleteAdminInstance(id, token);
      setInstances((prev) => prev.filter((i) => i.id !== id));
      setStats(null);
      toast.success(`Deleted instance "${name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete instance");
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const info = await createBackup(token);
      setBackups((prev) => [info, ...prev]);
      toast.success(`Backup created (${formatBytes(info.size)})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleDownload(name: string) {
    try {
      const blob = await downloadBackup(name, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download backup");
    }
  }

  async function handleRestore(name: string) {
    setRestoring(name);
    try {
      await restoreBackup(name, token);
      toast.success(`Restored from ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore backup");
    } finally {
      setRestoring(null);
    }
  }

  async function handleDeleteBackup(name: string) {
    try {
      await deleteBackup(name, token);
      setBackups((prev) => prev.filter((b) => b.name !== name));
      toast.success("Backup deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete backup");
    }
  }

  async function handleStripeAction(customerId: string, action: "cancel" | "reactivate") {
    setStripeBusy(customerId);
    try {
      const res = await adminStripeSubscriptionAction(customerId, action, token);
      if (!res.ok) throw new Error("Action failed");
      setStripeCustomers((prev) =>
        prev.map((c) =>
          c.stripeCustomerId === customerId ? { ...c, subscription: res.subscription } : c
        )
      );
      toast.success(
        action === "cancel"
          ? "Cancellation scheduled at period end."
          : "Subscription reactivated — billing resumed."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stripe action failed");
    } finally {
      setStripeBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage members and instances across the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({users.length})</TabsTrigger>
          <TabsTrigger value="instances">Instances ({instances.length})</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Members" value={stats?.totalUsers ?? 0} />
            <StatCard
              icon={Boxes}
              label="Instances"
              value={stats?.totalInstances ?? 0}
              hint={`${stats?.activeInstances ?? 0} active`}
            />
            <StatCard
              icon={Database}
              label="Data points"
              value={formatCompact(stats?.totalPoints ?? 0)}
            />
            <StatCard
              icon={Activity}
              label="Reads / Writes"
              value={`${formatCompact(stats?.totalReads ?? 0)} / ${formatCompact(
                stats?.totalWrites ?? 0
              )}`}
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" /> Plan distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PLAN_ORDER.map((p) => {
                const count = stats?.planDistribution?.[p] ?? 0;
                const pct = Math.round((count / planTotal) * 100);
                return (
                  <div key={p} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {getPlan(p).name}
                        {p === "free" ? (
                          <Badge variant="secondary" className="ml-2">
                            {p}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-2">
                            {p}
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {count} · {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Instances</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No members yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const initials = (u.displayName || u.email || u.uid || "?")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <TableRow key={u.uid}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {u.photoURL ? (
                                  <AvatarImage src={u.photoURL} alt={u.displayName || ""} />
                                ) : null}
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {u.displayName || "—"}
                                  {u.uid === user?.uid ? (
                                    <Badge variant="secondary" className="ml-2">
                                      you
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {u.email || u.uid}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <PlanSelect
                              value={u.plan}
                              onChange={(plan) => changeUserPlan(u.uid, plan)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {u.instanceCount}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.lastSeenAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DeleteButton
                              title="Delete member?"
                              description={`This permanently removes ${u.email || u.uid} and all ${u.instanceCount} of their instance(s). This cannot be undone.`}
                              onConfirm={() => removeUser(u.uid, u.email)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instances">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Keys</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No instances yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    instances.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{i.name}</div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {i.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.ownerEmail || i.ownerUid}
                        </TableCell>
                        <TableCell>
                          <PlanSelect
                            value={i.plan}
                            onChange={(plan) => changeInstance(i.id, { plan })}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLE[i.status]}>{i.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCompact(i.usage.points)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(i.usage.keys)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteButton
                            title="Delete instance?"
                            description={`This permanently deletes the instance "${i.name}" (${i.id}). This cannot be undone.`}
                            onConfirm={() => removeInstance(i.id, i.name)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4" /> Physical server
                {monitor?.online ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    offline
                  </Badge>
                )}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  checked {monitor ? new Date(monitor.checkedAt).toLocaleTimeString() : "—"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!monitor?.online ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  The managed GTSDB server is unreachable at the platform endpoint.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      icon={Database}
                      label="Server keys"
                      value={formatNumber(monitor.metrics?.gtsdb_key_count ?? 0)}
                    />
                    <StatCard
                      icon={HardDrive}
                      label="Data points"
                      value={formatCompact(monitor.metrics?.gtsdb_data_points_total ?? 0)}
                    />
                    <StatCard
                      icon={MemoryStick}
                      label="Memory (alloc)"
                      value={`${((monitor.metrics?.go_memstats_alloc_bytes ?? 0) / 1048576).toFixed(1)} MB`}
                    />
                    <StatCard
                      icon={Activity}
                      label="Uptime"
                      value={formatUptime(monitor.metrics?.gtsdb_uptime_seconds ?? 0)}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Gauge className="h-4 w-4" /> Runtime
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <InfoRow
                          label="Version"
                          value={monitor.serverinfo?.version ?? "1.0"}
                        />
                        <InfoRow
                          label="Goroutines"
                          value={formatNumber(monitor.metrics?.gtsdb_goroutines ?? 0)}
                        />
                        <InfoRow
                          label="CPU cores"
                          value={formatNumber(monitor.metrics?.go_cpu_count ?? 0)}
                        />
                        <InfoRow
                          label="Heap in use"
                          value={`${((monitor.metrics?.go_memstats_heap_inuse_bytes ?? 0) / 1048576).toFixed(1)} MB`}
                        />
                        <InfoRow
                          label="GC (total)"
                          value={`${((monitor.metrics?.go_gc_duration_seconds_sum ?? 0)).toFixed(3)}s`}
                        />
                        <InfoRow
                          label="File-handle LRU"
                          value={monitor.serverinfo?.file_handle_lru ?? "—"}
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4" /> Listen & storage
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <InfoRow
                          label="HTTP"
                          value={monitor.serverinfo?.listen_http ?? "—"}
                        />
                        <InfoRow
                          label="TCP"
                          value={monitor.serverinfo?.listen_tcp ?? "—"}
                        />
                        <InfoRow
                          label="Data dir"
                          value={monitor.dataDir}
                        />
                        <InfoRow
                          label="Data size"
                          value={`${formatBytes(monitor.dataDirBytes)} · ${monitor.dataDirFiles} files`}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FolderOpen className="h-4 w-4" /> Tenants on the physical server
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Instance</TableHead>
                            <TableHead>Token</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monitor.tenants.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center text-muted-foreground"
                              >
                                No tenants yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            monitor.tenants.map((t) => (
                              <TableRow key={t.name}>
                                <TableCell className="font-mono text-sm">{t.name}</TableCell>
                                <TableCell>
                                  {t.isRoot ? (
                                    <Badge>root</Badge>
                                  ) : (
                                    <Badge variant="outline">tenant</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {t.instance ? (
                                    <Link
                                      href={`/dashboard/instances/${t.instance.id}`}
                                      className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                                    >
                                      {t.instance.name}
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {t.tokenMasked}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Archive className="h-4 w-4" /> Backups
              </CardTitle>
              <CardDescription className="text-xs">
                A full snapshot of the platform database and the physical GTSDB
                data directory (WAL files + users.json), stored under
                <code className="mx-1 font-mono">cloud/data/backups</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-sm">
                  <div className="font-medium">Take a backup now</div>
                  <div className="text-xs text-muted-foreground">
                    Checkpoints the SQLite WAL, then archives everything into a
                    timestamped .zip.
                  </div>
                </div>
                <Button size="sm" onClick={handleBackup} disabled={backingUp}>
                  {backingUp ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Backup now
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No backups yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    backups.map((b) => (
                      <TableRow key={b.name}>
                        <TableCell className="font-mono text-xs">{b.name}</TableCell>
                        <TableCell className="text-sm">{formatBytes(b.size)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(b.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownload(b.name)}
                              aria-label="Download backup"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                                  aria-label="Restore backup"
                                  title="Restore"
                                  disabled={restoring !== null}
                                >
                                  {restoring === b.name ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This stops the managed GTSDB, overwrites the platform
                                    database and every timeseries data file with the{" "}
                                    <span className="font-mono">{b.name}</span> snapshot,
                                    then restarts GTSDB. Data written after this backup will
                                    be lost. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={restoring !== null}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                    disabled={restoring !== null}
                                    onClick={async () => {
                                      await handleRestore(b.name);
                                    }}
                                  >
                                    Restore
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <DeleteButton
                              title="Delete backup"
                              description={`Permanently delete ${b.name}? This cannot be undone.`}
                              onConfirm={() => handleDeleteBackup(b.name)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" /> Customers & subscriptions
              </CardTitle>
              <CardDescription className="text-xs">
                Platform users that have a Stripe customer, with their live
                subscription state. Cards are stored by Stripe — this platform
                never holds card data.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!stripeEnabled ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Stripe is not configured — no payment data available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Renews / cancels</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stripeCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No users have connected a Stripe customer yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stripeCustomers.map((c) => (
                        <TableRow key={c.uid}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">
                                  {(c.name || c.email || "?")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {c.name || "—"}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {c.email || c.uid}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            {c.subscription ? (
                              <Badge
                                className={
                                  c.subscription.status === "active" ||
                                  c.subscription.status === "trialing"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                }
                              >
                                {c.subscription.status}
                                {c.subscription.cancelAtPeriodEnd
                                  ? " · cancels"
                                  : ""}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No active subscription
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.subscription?.currentPeriodEnd
                              ? new Date(
                                  c.subscription.currentPeriodEnd
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c.stripeCustomerId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Open in Stripe dashboard"
                                  title="Open in Stripe dashboard"
                                  onClick={() =>
                                    window.open(
                                      `https://dashboard.stripe.com/test/customers/${c.stripeCustomerId}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              {c.subscription &&
                                (c.subscription.cancelAtPeriodEnd ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7"
                                    disabled={stripeBusy === c.stripeCustomerId}
                                    onClick={() =>
                                      handleStripeAction(
                                        c.stripeCustomerId!,
                                        "reactivate"
                                      )
                                    }
                                  >
                                    {stripeBusy === c.stripeCustomerId ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Zap className="mr-1 h-3 w-3" />
                                    )}
                                    Reactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-red-600 hover:text-red-700"
                                    disabled={stripeBusy === c.stripeCustomerId}
                                    onClick={() =>
                                      handleStripeAction(
                                        c.stripeCustomerId!,
                                        "cancel"
                                      )
                                    }
                                  >
                                    {stripeBusy === c.stripeCustomerId ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-1 h-3 w-3" />
                                    )}
                                    Cancel
                                  </Button>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" /> Stripe events
              </CardTitle>
              <CardDescription className="text-xs">
                Recent Stripe webhook/API events (newest first) — used to verify
                payments, downgrades and reactivations landed correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!stripeEnabled ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Stripe is not configured.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Object</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stripeEvents.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No Stripe events yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stripeEvents.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell className="font-mono text-xs">
                            {ev.type}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {ev.objectId ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(ev.created).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
