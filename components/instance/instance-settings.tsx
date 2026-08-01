"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { deleteInstance, updateInstance } from "@/lib/api";
import { getPlan, formatPoints } from "@/lib/plans";
import type { InstanceRegion, PlatformInstance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlanBadge } from "@/components/dashboard/plan-badge";
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

const REGIONS: Array<{ value: InstanceRegion; label: string }> = [
  { value: "auto", label: "Auto (nearest)" },
  { value: "asia-east1", label: "asia-east1 (Taiwan)" },
  { value: "asia-northeast1", label: "asia-northeast1 (Tokyo)" },
  { value: "europe-west1", label: "europe-west1 (Belgium)" },
  { value: "us-central1", label: "us-central1 (Iowa)" },
  { value: "us-east1", label: "us-east1 (S. Carolina)" },
  { value: "local", label: "Local / self-hosted" },
];

export function InstanceSettings({
  instance,
  onChanged,
}: {
  instance: PlatformInstance;
  onChanged: (inst: PlatformInstance) => void;
}) {
  const { authToken } = useAuth();
  const router = useRouter();
  const token = authToken || "";

  const [name, setName] = React.useState(instance.name);
  const [region, setRegion] = React.useState<InstanceRegion>(instance.region);
  const [endpoint, setEndpoint] = React.useState(instance.endpoint);
  const [serverToken, setServerToken] = React.useState(instance.token);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const plan = getPlan(instance.plan);
  const dirty =
    name !== instance.name ||
    region !== instance.region ||
    (instance.external &&
      (endpoint !== instance.endpoint || serverToken !== instance.token));

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateInstance(
        instance.id,
        instance.external ? { name, region, endpoint, token: serverToken } : { name, region },
        token
      );
      toast.success("Instance settings saved");
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInstance(instance.id, token);
      toast.success("Instance deleted");
      router.replace("/dashboard/instances");
    } catch {
      toast.error("Failed to delete instance");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">General</CardTitle>
          <CardDescription>
            Name and region. Connection strings and credentials live on the{" "}
            <a href="#connection" className="text-primary underline underline-offset-2">
              Connection
            </a>{" "}
            tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Instance name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as InstanceRegion)}>
              <SelectTrigger id="region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {instance.external && (
            <>
              <div className="space-y-2">
                <Label htmlFor="endpoint">GTSDB address</Label>
                <Input
                  id="endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://1.2.3.4:5556 or my-gtsdb.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverToken">Token (optional)</Label>
                <Input
                  id="serverToken"
                  type="password"
                  autoComplete="off"
                  value={serverToken}
                  onChange={(e) => setServerToken(e.target.value)}
                  placeholder="Leave blank if your server needs no token"
                />
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            Plan <PlanBadge plan={instance.plan} />
          </CardTitle>
          <CardDescription>
            {plan.features.length} features included with the {plan.name} plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max series</span>
            <span>{plan.maxKeysPerInstance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retention</span>
            <span>{plan.retentionDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data points storage</span>
            <span>{formatPoints(plan.maxPoints)}</span>
          </div>
          <Separator className="my-2" />
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/billing">Change plan</a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Deleting an instance removes its platform metadata. Data on the
            underlying GTSDB server is untouched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete instance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this instance?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes <b>{instance.name}</b> and its platform
                  metadata. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
