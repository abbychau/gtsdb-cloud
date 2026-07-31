import { getPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STYLES: Record<PlanId, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary/15 text-primary",
  team: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

export function PlanBadge({ plan }: { plan: PlanId }) {
  return (
    <Badge variant="outline" className={STYLES[plan]}>
      {getPlan(plan).name}
    </Badge>
  );
}
