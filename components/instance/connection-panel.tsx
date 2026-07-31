"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Network,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { regenerateInstanceToken, revokeInstanceToken, updateInstance } from "@/lib/api";
import { maskToken } from "@/lib/utils";
import type { PlatformInstance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy} aria-label={label}>
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function ConnectionPanel({
  instance,
  onChanged,
}: {
  instance: PlatformInstance;
  onChanged: (inst: PlatformInstance) => void;
}) {
  const { authToken } = useAuth();
  const token = authToken || "";

  const [reveal, setReveal] = React.useState(false);
  const [rotating, setRotating] = React.useState(false);
  const [revoking, setRevoking] = React.useState(false);
  const [backend, setBackend] = React.useState(instance.endpoint);
  const [savingBackend, setSavingBackend] = React.useState(false);

  const tcpEndpoint = instance.connectionString
    .replace(/^https:\/\//, "")
    .replace(/^http:\/\//, "") + ":5555";

  async function handleRotate() {
    setRotating(true);
    try {
      const updated = await regenerateInstanceToken(instance.id, token);
      toast.success("Connection credential rotated");
      onChanged(updated);
    } catch {
      toast.error("Failed to rotate credential");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      const updated = await revokeInstanceToken(instance.id, token);
      toast.success("Connection credential revoked");
      onChanged(updated);
    } catch {
      toast.error("Failed to revoke credential");
    } finally {
      setRevoking(false);
    }
  }

  async function handleSaveBackend() {
    setSavingBackend(true);
    try {
      const updated = await updateInstance(instance.id, { endpoint: backend.trim() }, token);
      toast.success("Backend endpoint updated");
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update backend");
    } finally {
      setSavingBackend(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Auto-generated endpoints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="h-4 w-4" /> Connection string
          </CardTitle>
          <CardDescription>
            Auto-generated when the instance was created — no setup required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">HTTP API</div>
              <div className="truncate font-mono text-sm">{instance.connectionString}</div>
            </div>
            <CopyButton value={instance.connectionString} label="Copy HTTP endpoint" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">TCP (high-throughput)</div>
              <div className="truncate font-mono text-sm">{tcpEndpoint}</div>
            </div>
            <CopyButton value={tcpEndpoint} label="Copy TCP endpoint" />
          </div>
          <p className="text-xs text-muted-foreground">
            Point your SDKs at these endpoints to write and query data. The
            platform routes requests to your sandbox or backend on your behalf.
          </p>
        </CardContent>
      </Card>

      {/* Credential management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" /> Connection credential
          </CardTitle>
          <CardDescription>
            Managed separately from the instance — rotate or revoke anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Token
                {instance.token ? (
                  <Badge variant="secondary">active</Badge>
                ) : (
                  <Badge variant="outline">revoked</Badge>
                )}
              </div>
              <div className="mt-1 truncate font-mono text-sm">
                {instance.token ? (reveal ? instance.token : maskToken(instance.token)) : "(revoked)"}
              </div>
            </div>
            {instance.token && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? "Hide token" : "Show token"}
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <CopyButton value={instance.token} label="Copy token" />
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!instance.token}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Rotate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rotate connection credential?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A new credential will be generated. Existing clients using the
                    old token will be disconnected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={rotating}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRotate} disabled={rotating}>
                    {rotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Rotate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!instance.token} className="text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke connection credential?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The token will be cleared and all client requests using it will
                    be rejected until you generate a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevoke}
                    disabled={revoking}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Revoke
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: platform backend (self-hosted) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Platform backend (advanced)</CardTitle>
          <CardDescription>
            Where the platform forwards requests. Leave empty to use the sandbox
            simulator, or point it at your own GTSDB server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="backend">Backend address</Label>
            <Input
              id="backend"
              value={backend}
              onChange={(e) => setBackend(e.target.value)}
              placeholder="http://localhost:5556"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveBackend}
              disabled={savingBackend || backend.trim() === instance.endpoint}
            >
              {savingBackend ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save backend
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
