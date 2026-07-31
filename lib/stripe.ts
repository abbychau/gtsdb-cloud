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
