"use client";

import Link from "next/link";
import { ArrowUpRight, Database, MoreHorizontal, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { deleteInstance } from "@/lib/api";
import { formatCompact, formatDate } from "@/lib/utils";
import type { PlatformInstance } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function InstanceCard({
  instance,
  onChanged,
}: {
  instance: PlatformInstance;
  onChanged: () => void;
}) {
  const { authToken } = useAuth();
  const router = useRouter();

  async function handleDelete() {
    try {
      await deleteInstance(instance.id, authToken || "");
      toast.success(`Instance "${instance.name}" deleted`);
      onChanged();
    } catch {
      toast.error("Failed to delete instance");
    }
  }

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <Link
              href={`/dashboard/instances/${instance.id}`}
              className="font-semibold hover:underline"
            >
              {instance.name}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <ConnectionStatus status={instance.status} />
              <PlanBadge plan={instance.plan} />
              {instance.external && <Badge variant="outline">Self-hosted</Badge>}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/instances/${instance.id}`}>
                <ArrowUpRight className="mr-2 h-4 w-4" /> Open
              </Link>
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete instance?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes <b>{instance.name}</b> and its platform
                    metadata. Data on the underlying GTSDB server is not touched.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-lg font-semibold">
            {formatCompact(instance.usage.points)}
          </div>
          <div className="text-xs text-muted-foreground">points</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-lg font-semibold">{instance.usage.keys}</div>
          <div className="text-xs text-muted-foreground">keys</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="truncate text-lg font-semibold">{instance.region}</div>
          <div className="text-xs text-muted-foreground">region</div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Created {formatDate(instance.createdAt)}</span>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/instances/${instance.id}`}>
            Open <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
