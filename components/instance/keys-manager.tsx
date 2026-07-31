"use client";

import * as React from "react";
import {
  Archive,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { proxyOperation } from "@/lib/api";
import { ops } from "@/lib/gtsdb";
import type { GtsdbResponse, KeyCount, PlatformInstance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";

export function KeysManager({ instance }: { instance: PlatformInstance }) {
  const { authToken } = useAuth();
  const token = authToken || "";
  const [keys, setKeys] = React.useState<KeyCount[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [newKey, setNewKey] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const [renameTarget, setRenameTarget] = React.useState<KeyCount | null>(null);
  const [renameTo, setRenameTo] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<KeyCount | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const loadKeys = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(instance.id, ops.idsWithCount(), token);
      if (res.success) setKeys((res.data as KeyCount[]) || []);
    } catch {
      toast.error("Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [instance.id, token]);

  React.useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setCreating(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(
        instance.id,
        ops.initKey(newKey.trim()),
        token
      );
      if (res.success) {
        toast.success(res.message || "Key created");
        setNewKey("");
        loadKeys();
      } else {
        toast.error(res.message || "Failed to create key");
      }
    } catch {
      toast.error("Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameTo.trim()) return;
    setRenaming(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(
        instance.id,
        ops.renameKey(renameTarget.key, renameTo.trim()),
        token
      );
      if (res.success) {
        toast.success(res.message || "Key renamed");
        setRenameTarget(null);
        setRenameTo("");
        loadKeys();
      } else {
        toast.error(res.message || "Rename failed");
      }
    } catch {
      toast.error("Rename failed");
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(
        instance.id,
        ops.deleteKey(deleteTarget.key),
        token
      );
      if (res.success) {
        toast.success(res.message || "Key deleted");
        setDeleteTarget(null);
        loadKeys();
      } else {
        toast.error(res.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function runKeyOp(op: "compact" | "reloadkey", key: string) {
    setBusyKey(key);
    try {
      const req = op === "compact" ? ops.compactKey(key) : ops.reloadKey(key);
      const res = await proxyOperation<GtsdbResponse>(instance.id, req, token);
      if (res.success) {
        toast.success(res.message || `${op} done`);
      } else {
        toast.error(res.message || `${op} failed`);
      }
    } catch {
      toast.error(`${op} failed`);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4" /> Keys ({keys.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={loadKeys} disabled={loading}>
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="New key name (e.g. sensor-2)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="font-mono text-xs"
          />
          <Button type="submit" disabled={creating || !newKey.trim()}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create
          </Button>
        </form>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No keys yet"
            description="Initialize a key above, or write your first data point from the explorer."
          />
        ) : (
          <ScrollArea className="max-h-[480px]">
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.key}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate font-mono text-xs">{k.key}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {k.count.toLocaleString()} pts
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Rename"
                      onClick={() => {
                        setRenameTarget(k);
                        setRenameTo(k.key);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Compact"
                      disabled={busyKey === k.key}
                      onClick={() => runKeyOp("compact", k.key)}
                    >
                      {busyKey === k.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Reload from disk"
                      disabled={busyKey === k.key}
                      onClick={() => runKeyOp("reloadkey", k.key)}
                    >
                      {busyKey === k.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => setDeleteTarget(k)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename key</DialogTitle>
            <DialogDescription>
              Rename <b className="font-mono">{renameTarget?.key}</b> to a new name.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
            className="font-mono text-xs"
            placeholder="new-key-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renaming || !renameTo.trim()}>
              {renaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete key?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <b className="font-mono">{deleteTarget?.key}</b> and
              all of its data points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
