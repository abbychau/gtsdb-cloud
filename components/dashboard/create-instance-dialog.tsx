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
  managedCount,
  externalCount,
  onCreated,
}: {
  plan: "free" | "pro" | "team";
  managedCount: number;
  externalCount: number;
  onCreated: (instance: PlatformInstance) => void;
}) {
  const { authToken } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [region, setRegion] = React.useState<InstanceRegion>("auto");
  const [mode, setMode] = React.useState<"managed" | "external">("managed");
  const [endpoint, setEndpoint] = React.useState("");
  const [serverToken, setServerToken] = React.useState("");

  const planDef = getPlan(plan);
  const atLimit = !canCreateInstance(plan, managedCount);
  const extAtLimit = externalCount >= planDef.maxExternalInstances;
  const noCapacity = atLimit && extAtLimit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const input =
        mode === "external"
          ? { name, region, endpoint: endpoint.trim(), token: serverToken.trim() }
          : { name, region };
      const inst = await createInstance(input, authToken || "");
      toast.success(
        mode === "external"
          ? `Connected to ${inst.connectionString}`
          : `Instance "${inst.name}" created`,
        { description: mode === "external" ? inst.name : `Connection: ${inst.connectionString}` }
      );
      setOpen(false);
      setName("");
      setEndpoint("");
      setServerToken("");
      setMode("managed");
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
        <Button disabled={noCapacity}>
          <Plus className="mr-2 h-4 w-4" />
          New instance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new instance</DialogTitle>
          <DialogDescription>
            Spin up a managed instance on the shared GTSDB server — or connect
            to your own GTSDB by IP or domain.
          </DialogDescription>
        </DialogHeader>

        {mode === "managed" && atLimit && (
          <Alert variant="destructive">
            <AlertDescription>
              Your {planDef.name} plan allows up to {planDef.maxInstances} managed
              instance(s). Delete one or upgrade to create another.
            </AlertDescription>
          </Alert>
        )}
        {mode === "external" && extAtLimit && (
          <Alert variant="destructive">
            <AlertDescription>
              Your {planDef.name} plan allows up to {planDef.maxExternalInstances}{" "}
              self-hosted connection(s). Delete one or upgrade to add more.
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

          <div className="space-y-2">
            <Label>Connection type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "managed" ? "default" : "outline"}
                onClick={() => setMode("managed")}
              >
                Managed
              </Button>
              <Button
                type="button"
                variant={mode === "external" ? "default" : "outline"}
                onClick={() => setMode("external")}
                disabled={extAtLimit}
              >
                My own GTSDB
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "external"
                ? "Connect to your own GTSDB by IP or domain. "
                : "Managed instances run on the shared GTSDB server. "}
              Self-hosted connections: {externalCount} / {planDef.maxExternalInstances}
              {extAtLimit ? " (limit reached — upgrade to add more)" : ""}
            </p>
          </div>

          {mode === "external" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="endpoint">GTSDB address</Label>
                <Input
                  id="endpoint"
                  placeholder="http://1.2.3.4:5556 or my-gtsdb.example.com"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your server&apos;s HTTP endpoint — IP, domain, or full URL.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverToken">Token (optional)</Label>
                <Input
                  id="serverToken"
                  type="password"
                  autoComplete="off"
                  placeholder="Bearer token (leave blank if none)"
                  value={serverToken}
                  onChange={(e) => setServerToken(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || (mode === "managed" ? atLimit : extAtLimit)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create instance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
