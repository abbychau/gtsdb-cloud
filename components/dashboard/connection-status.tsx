import type { InstanceStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<
  InstanceStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  provisioning: {
    label: "Provisioning",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  offline: {
    label: "Offline",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  suspended: {
    label: "Suspended",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function ConnectionStatus({
  status,
  className,
}: {
  status: InstanceStatus;
  className?: string;
}) {
  const m = MAP[status] ?? MAP.offline;
  return (
    <Badge variant="outline" className={cn(m.className, className)}>
      <span className={cn("mr-1.5 h-2 w-2 rounded-full", m.dot)} />
      {m.label}
    </Badge>
  );
}
