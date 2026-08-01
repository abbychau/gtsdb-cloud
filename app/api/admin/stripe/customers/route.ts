import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { handle } from "@/lib/route-utils";
import { listAllUsers } from "@/lib/store";
import { getActiveSubscription, getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Platform users that have a Stripe customer, enriched with their active
// subscription. Admin-only — this is how the admin manages user payments.
export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json({ enabled: false, customers: [] });
  }
  const users = await listAllUsers();
  const rows = await Promise.all(
    users
      .filter((u) => u.stripeCustomerId)
      .map(async (u) => {
        let subscription = null;
        try {
          subscription = await getActiveSubscription(stripe, u.stripeCustomerId!);
        } catch {
          subscription = null;
        }
        return {
          uid: u.uid,
          email: u.email ?? null,
          name: u.displayName ?? null,
          plan: u.plan,
          stripeCustomerId: u.stripeCustomerId,
          subscription,
        };
      })
  );
  // Newest-created first isn't available on the store, so sort by subscription
  // presence then email for a stable list.
  rows.sort(
    (a, b) =>
      (b.subscription ? 1 : 0) - (a.subscription ? 1 : 0) ||
      (a.email ?? "").localeCompare(b.email ?? "")
  );
  return NextResponse.json({ enabled: true, customers: rows });
});
