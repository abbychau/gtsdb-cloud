import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SNIPPET = `$ curl -X POST https://<your-instance>.gtsdb.cloud \\
    -H "Authorization: Bearer gtsb_xxxx" \\
    -d '{"operation":"write","key":"sensor-1","write":{"value":42.5}}'

{"success":true,"message":"Data point stored"}`;

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 30rem at 70% -10%, hsl(var(--primary) / 0.12), transparent 60%), radial-gradient(40rem 24rem at 10% 0%, hsl(var(--primary) / 0.06), transparent 55%)",
        }}
      />
      <div className="container grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <Badge variant="secondary" className="mb-4 gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Now in public beta — free tier included
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Timeseries that just{" "}
            <span className="bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
              works
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            GTSDB Cloud is a managed, freemium timeseries database built on the
            WAL-first GTSDB engine. Sub-millisecond reads, 233× faster writes
            than InfluxDB, and a beautiful console to explore, query and scale
            your data.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · 1M points/mo free · Email & Google sign-in
          </p>
        </div>

        <div className="relative">
          <div className="rounded-xl border bg-card shadow-xl">
            <div className="flex items-center gap-1.5 border-b px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-muted-foreground">
                terminal — gtsdb cloud
              </span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-foreground">
              <code>{SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
