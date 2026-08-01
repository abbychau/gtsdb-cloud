"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function Cta() {
  const { user } = useAuth();
  return (
    <section className="container pb-20">
      <div className="relative overflow-hidden rounded-2xl border bg-primary px-6 py-16 text-center text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(40rem 20rem at 50% -20%, white, transparent 60%)",
          }}
        />
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to ship your timeseries?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Create your free instance in seconds. No credit card, no cluster
          management — just data.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link href={user ? "/dashboard" : "/signup"}>
              {user ? "Go to dashboard" : "Get started free"}{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link href="/docs">Explore the docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
