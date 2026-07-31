import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  subtitle = "Cloud",
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        GTSDB<span className="text-primary"> Cloud</span>
        {subtitle ? (
          <span className="sr-only"> {subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
