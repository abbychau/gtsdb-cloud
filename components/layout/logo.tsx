import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/app/logo.png";

export function Logo({
  className,
  subtitle = "Cloud",
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      {/* White-tile logo: sits on a white rounded tile so it reads as a
          brand mark in both light and dark themes (logo.png has an opaque
          white background). */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-md dark:ring-white/10">
        <Image
          src={logo}
          alt="GTSDB Cloud"
          width={505}
          height={474}
          priority
          className="h-7 w-7 object-contain"
        />
      </span>
      <span className="text-xl font-extrabold leading-none tracking-tight">
        <span className="text-foreground">GTSDB</span>
        <span className="bg-gradient-to-r from-primary via-primary to-sky-500 bg-clip-text text-transparent">
          {" "}
          Cloud
        </span>
        {subtitle ? (
          <span className="sr-only"> {subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
