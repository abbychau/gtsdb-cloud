"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export function PricingSection() {
  const { user } = useAuth();
  return (
    <section id="pricing" className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, freemium pricing
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start free forever. Upgrade when your sensors outgrow the free tier.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          return (
            <Card
              key={id}
              className={cn(
                "relative flex flex-col transition-shadow hover:shadow-md",
                plan.highlighted && "border-primary shadow-lg"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <CardHeader>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                {plan.priceYearly > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ${plan.priceYearly}/yr billed annually
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant={plan.highlighted ? "default" : "outline"} className="w-full">
                  {user ? (
                    <Link href="/dashboard">
                      Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : (
                    <Link href="/signup">{plan.cta}</Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
