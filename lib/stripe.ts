// Stripe integration (server-only). Wired so it degrades gracefully: when the
// secret key is empty the platform keeps the demo billing flow.
//
// Keys live in .env.local:
//   STRIPE_SECRET_KEY=sk_test_...        (server-side secret)
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
//   STRIPE_WEBHOOK_SECRET=whsec_...      (for the /api/billing/webhook)
//   STRIPE_PRICE_PRO=price_...           (recurring price for the Pro plan)
//   STRIPE_PRICE_TEAM=price_...          (recurring price for the Team plan)

import Stripe from "stripe";
import type { PlanId } from "./types";

export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

/** Server-side: true when a real (non-empty) secret key is configured. */
export function isStripeConfigured(): boolean {
  return getStripeSecretKey().startsWith("sk_");
}

/** Client-side flag (NEXT_PUBLIC publishable key set) to enable checkout UI. */
export function isStripeConfiguredClient(): boolean {
  return getStripePublishableKey().startsWith("pk_");
}

export function getStripe(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

/** Recurring price id for a paid plan ("" for free / unconfigured). */
export function getPriceId(plan: PlanId): string {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO || "";
  if (plan === "team") return process.env.STRIPE_PRICE_TEAM || "";
  return "";
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

// stripe v22 types omit `current_period_end` on the Subscription response even
// though the API returns it. Read it defensively, falling back to the first
// subscription item (which IS typed) when absent.
function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const raw = sub as Stripe.Subscription & { current_period_end?: number | null };
  if (typeof raw.current_period_end === "number") return raw.current_period_end;
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  return typeof item?.current_period_end === "number" ? item.current_period_end : null;
}

/** Find the user's active/billable subscription, normalized for the UI. */
export async function getActiveSubscription(
  stripe: Stripe,
  customerId: string
): Promise<SubscriptionInfo | null> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  const active = subs.data.find((s) =>
    ["active", "trialing", "past_due", "unpaid"].includes(s.status)
  );
  if (!active) return null;
  const periodEnd = subscriptionPeriodEnd(active);
  return {
    id: active.id,
    status: active.status,
    cancelAtPeriodEnd: active.cancel_at_period_end,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
}
