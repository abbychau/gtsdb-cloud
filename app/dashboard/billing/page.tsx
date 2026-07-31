"use client";

import * as React from "react";
import { Check, CreditCard, Info, Loader2, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { PLANS, PLAN_ORDER, getPlan } from "@/lib/plans";
import { formatCompact } from "@/lib/utils";
import type { PlanId } from "@/lib/types";
import { useInstances } from "@/hooks/use-instances";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { cn } from "@/lib/utils";

async function setPlan(plan: PlanId, token: string) {
  const res = await fetch("/api/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : "Failed to update plan"
    );
  }
  return res.json();
}

const INVOICES = [
  { id: "INV-2026-0001", date: "Jul 1, 2026", amount: "$0.00", status: "Paid", plan: "free" as PlanId },
  { id: "INV-2026-0002", date: "Jun 1, 2026", amount: "$0.00", status: "Paid", plan: "free" as PlanId },
];

// Inlined at build time; enables the real Stripe checkout flow.
const stripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function BillingPage() {
  const { authToken, user } = useAuth();
  const { instances, plan, limits, refresh } = useInstances();
  const [busy, setBusy] = React.useState<PlanId | null>(null);
  const [showInvoices, setShowInvoices] = React.useState(false);
  const [portalBusy, setPortalBusy] = React.useState(false);
  const [subInfo, setSubInfo] = React.useState<{
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null>(null);

  const totalPoints = instances.reduce((s, i) => s + i.usage.points, 0);
  const planDef = getPlan(plan);
  // True when the user cancelled and is waiting for the billing period to end.
  const scheduled = stripeEnabled && subInfo?.cancelAtPeriodEnd === true && plan !== "free";

  async function refreshSub() {
    if (!stripeEnabled || !authToken) return;
    try {
      const res = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          subscription: { cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null } | null;
        };
        setSubInfo(data.subscription ?? null);
      }
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    if (!stripeEnabled || !authToken) return;
    let active = true;
    fetch("/api/billing/status", { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { subscription?: { cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null } } | null) => {
        if (active) setSubInfo(d?.subscription ?? null);
      })
      .catch(() => {
        if (active) setSubInfo(null);
      });
    return () => {
      active = false;
    };
  }, [authToken]);

  async function handleSwitch(target: PlanId) {
    if (!authToken) return;
    setBusy(target);
    try {
      // No Stripe configured → demo plan switch.
      if (!stripeEnabled) {
        await setPlan(target, authToken);
        toast.success(`Switched to ${getPlan(target).name} plan`);
        refresh();
        return;
      }
      // Downgrade to Free → schedule Stripe cancellation at period end.
      if (target === "free") {
        const res = await fetch("/api/billing/cancel", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = (await res.json().catch(() => null)) as {
          currentPeriodEnd?: string | null;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(data?.error ?? "Failed to cancel subscription");
        if (data?.currentPeriodEnd) {
          toast.success(
            "Subscription cancelled — you stay on your plan until the end of the billing period, then auto-downgrade to Free."
          );
        } else {
          toast.success("Downgraded to Free plan");
        }
        await refreshSub();
        refresh();
        return;
      }
      // Paid upgrade / reactivation → Stripe.
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ plan: target }),
      });
      const data = (await res.json().catch(() => null)) as {
        url?: string;
        reactivated?: boolean;
        error?: string;
      } | null;
      if (!res.ok || (!data?.url && !data?.reactivated)) {
        throw new Error(data?.error ?? "Failed to start checkout");
      }
      if (data.reactivated) {
        toast.success(`${getPlan(target).name} reactivated — billing resumed.`);
        await refreshSub();
        refresh();
        return;
      }
      window.location.href = data.url as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setBusy(null);
    }
  }

  async function handlePortal() {
    if (!authToken) return;
    setPortalBusy(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Failed to open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, usage and invoices.
        </p>
      </div>

      {/* Pending cancellation — keeps the paid plan until period end */}
      {scheduled && subInfo?.currentPeriodEnd && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <Info className="h-4 w-4" /> Subscription cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your <span className="font-medium text-foreground">{planDef.name}</span>{" "}
            plan stays active until{" "}
            <span className="font-medium text-foreground">
              {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
            </span>{" "}
            (end of your billing period). After that you&apos;ll automatically be
            downgraded to the Free plan. You can{" "}
            <span className="font-medium text-foreground">
              reactivate {planDef.name}
            </span>{" "}
            anytime before then to keep your plan and resume billing.
          </CardContent>
        </Card>
      )}

      {/* Current plan summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" /> Current plan
              <PlanBadge plan={plan} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Instance quota</span>
              <span className="text-sm font-medium">
                {instances.length} / {planDef.maxInstances}
              </span>
            </div>
            <Progress
              value={Math.min(100, (instances.length / planDef.maxInstances) * 100)}
            />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Data points stored</span>
              <span className="text-sm font-medium">
                {formatCompact(totalPoints)} / {formatCompact(planDef.maxPoints)}
              </span>
            </div>
            <Progress
              value={Math.min(100, (totalPoints / planDef.maxPoints) * 100)}
            />
            {user?.provider === "demo" && (
              <p className="text-xs text-muted-foreground">
                Demo billing — plan switches are simulated locally. Wire in a
                payment provider for production.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4" /> Payment method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">No card on file</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;re on the free plan — no payment required.
              </p>
            </div>
            {stripeEnabled && plan !== "free" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={portalBusy}
                onClick={handlePortal}
              >
                {portalBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Manage billing
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowInvoices((v) => !v)}
              >
                {showInvoices ? "Hide" : "View"} invoices
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> Choose a plan
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const current = plan === id;
            return (
              <Card
                key={id}
                className={cn(
                  "relative flex flex-col",
                  p.highlighted && "border-primary",
                  current && "ring-2 ring-primary"
                )}
              >
                {current && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Current plan
                  </Badge>
                )}
                <CardHeader>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      ${p.priceMonthly}
                    </span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                  {p.priceYearly > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${p.priceYearly}/yr billed annually
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={current ? "outline" : p.highlighted ? "default" : "outline"}
                    disabled={
                      busy !== null || (current && !(scheduled && p.priceMonthly > 0))
                    }
                    onClick={() => handleSwitch(id)}
                  >
                    {busy === id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {current && scheduled && p.priceMonthly > 0
                      ? `Reactivate ${p.name}`
                      : current
                      ? "Current plan"
                      : p.priceMonthly === 0
                      ? "Downgrade to Free"
                      : `Upgrade to ${p.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      {showInvoices && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {INVOICES.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{inv.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.date} · {inv.plan} plan
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{inv.amount}</span>
                    <Badge variant="secondary">{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        {stripeEnabled
          ? "Billing is handled by Stripe Checkout. Cancelling a subscription keeps your plan active until the end of the billing period, then automatically downgrades you to Free. Reactivate anytime before then to resume billing."
          : "Billing is a demonstration of the freemium flow. Plans and invoices are simulated — no real charges are made. Set STRIPE_SECRET_KEY to enable real payments."}
      </p>
    </div>
  );
}
