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
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { regenerateInstanceToken } from "@/lib/api";
import { maskToken } from "@/lib/utils";
import type { PlatformInstance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value ?? "—"}</span>
    </div>
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
  const provisioned = Boolean(instance.namespace);

  async function handleRotate() {
    setRotating(true);
    try {
      const updated = await regenerateInstanceToken(instance.id, token);
      toast.success("Connection credential rotated");
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate credential");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Managed endpoints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="h-4 w-4" /> Connection string
          </CardTitle>
          <CardDescription>
            Your instance runs on the shared, multi-tenant GTSDB server. These
            are the endpoints your SDKs should use.
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
              <div className="truncate font-mono text-sm">{instance.tcpConnectionString}</div>
            </div>
            <CopyButton value={instance.tcpConnectionString} label="Copy TCP endpoint" />
          </div>
          <p className="text-xs text-muted-foreground">
            Authenticate with your connection credential (below). GTSDB scopes
            every request to your instance&apos;s namespace — other tenants are
            isolated automatically.
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
            Managed separately from the instance — rotate anytime to invalidate
            the old token.
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
                  <Badge variant="outline">not set</Badge>
                )}
              </div>
              <div className="mt-1 truncate font-mono text-sm">
                {instance.token ? (reveal ? instance.token : maskToken(instance.token)) : "(not set)"}
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!instance.token}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Rotate credential
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate connection credential?</AlertDialogTitle>
                <AlertDialogDescription>
                  {provisioned
                    ? "GTSDB will reset your tenant token — the current one is immediately invalidated and clients using it will be disconnected."
                    : "A new sandbox credential will be generated."}
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
        </CardContent>
      </Card>

      {/* Managed server / tenant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" /> Managed server
          </CardTitle>
          <CardDescription>
            This instance is an isolated tenant on the shared GTSDB server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InfoRow label="Backend" value={instance.endpoint || "sandbox"} />
          <InfoRow label="Namespace" value={instance.namespace || "sandbox"} />
          <InfoRow
            label="Sandbox fallback"
            value={instance.simulate ? "enabled" : "disabled"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
