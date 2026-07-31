"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createInstance } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { InstanceRegion, PlatformInstance } from "@/lib/types";
import { getPlan, canCreateInstance } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

const REGIONS: Array<{ value: InstanceRegion; label: string }> = [
  { value: "auto", label: "Auto (nearest)" },
  { value: "asia-east1", label: "asia-east1 (Taiwan)" },
  { value: "asia-northeast1", label: "asia-northeast1 (Tokyo)" },
  { value: "europe-west1", label: "europe-west1 (Belgium)" },
  { value: "us-central1", label: "us-central1 (Iowa)" },
  { value: "us-east1", label: "us-east1 (S. Carolina)" },
  { value: "local", label: "Local / self-hosted" },
];

export function CreateInstanceDialog({
  plan,
  instanceCount,
  onCreated,
}: {
  plan: "free" | "pro" | "team";
  instanceCount: number;
  onCreated: (instance: PlatformInstance) => void;
}) {
  const { authToken } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [region, setRegion] = React.useState<InstanceRegion>("auto");
  const [simulate, setSimulate] = React.useState(true);

  const planDef = getPlan(plan);
  const atLimit = !canCreateInstance(plan, instanceCount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const inst = await createInstance({ name, region, simulate }, authToken || "");
      toast.success(`Instance "${inst.name}" created`, {
        description: `Connection: ${inst.connectionString}`,
      });
      setOpen(false);
      setName("");
      onCreated(inst);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to create instance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={atLimit}>
          <Plus className="mr-2 h-4 w-4" />
          New instance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new instance</DialogTitle>
          <DialogDescription>
            The platform auto-generates a connection string and credential —
            nothing to configure. Sandbox simulation is enabled by default.
          </DialogDescription>
        </DialogHeader>

        {atLimit && (
          <Alert variant="destructive">
            <AlertDescription>
              Your {planDef.name} plan allows up to {planDef.maxInstances} instance(s).
              Delete one or upgrade to create another.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Instance name</Label>
            <Input
              id="name"
              placeholder="e.g. prod-sensors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as InstanceRegion)}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region" />
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="simulate" className="text-sm font-medium">
                Enable sandbox simulation
              </Label>
              <p className="text-xs text-muted-foreground">
                Serve demo data when the endpoint is unreachable.
              </p>
            </div>
            <Switch
              id="simulate"
              checked={simulate}
              onCheckedChange={setSimulate}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || atLimit}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create instance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
