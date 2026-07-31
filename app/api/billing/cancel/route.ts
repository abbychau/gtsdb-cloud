import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle } from "@/lib/route-utils";
import { getUser, setUserPlan } from "@/lib/store";
import { syncUserQuotas } from "@/lib/gtsdb-server";
import { getActiveSubscription, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Downgrade the authenticated user to the Free plan. If they have an active
// Stripe subscription, schedule cancellation AT THE END of the billing period
// (cancel_at_period_end) — they keep the paid plan until then, then the
// customer.subscription.deleted webhook downgrades them to Free automatically.
export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const stripe = getStripe();

  // No Stripe configured → plain local downgrade (demo mode).
  if (!stripe) {
    await setUserPlan(user.uid, "free");
    await syncUserQuotas(user.uid, "free").catch(() => undefined);
    return NextResponse.json({ cancelled: false, downgraded: true, currentPeriodEnd: null });
  }

  const record = await getUser(user.uid);
  if (!record?.stripeCustomerId) {
    // No Stripe customer → nothing to cancel; downgrade locally.
    await setUserPlan(user.uid, "free");
    await syncUserQuotas(user.uid, "free").catch(() => undefined);
    return NextResponse.json({ cancelled: false, downgraded: true, currentPeriodEnd: null });
  }

  const active = await getActiveSubscription(stripe, record.stripeCustomerId);
  if (!active) {
    // No active subscription → nothing to schedule; downgrade locally.
    await setUserPlan(user.uid, "free");
    await syncUserQuotas(user.uid, "free").catch(() => undefined);
    return NextResponse.json({ cancelled: false, downgraded: true, currentPeriodEnd: null });
  }

  if (!active.cancelAtPeriodEnd) {
    await stripe.subscriptions.update(active.id, { cancel_at_period_end: true });
  }

  // Keep the paid plan locally until the period ends — the deleted webhook
  // downgrades to Free at period end.
  return NextResponse.json({
    cancelled: true,
    scheduled: true,
    currentPeriodEnd: active.currentPeriodEnd,
  });
});
