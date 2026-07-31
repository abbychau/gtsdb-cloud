import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle } from "@/lib/route-utils";
import { getUser, setUserPlan } from "@/lib/store";
import { syncUserQuotas } from "@/lib/gtsdb-server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Downgrade the authenticated user to the Free plan. If they have an active
// Stripe subscription, cancel it immediately so they stop being charged. The
// customer.subscription.deleted webhook later confirms (idempotent).
export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const stripe = getStripe();

  // No Stripe configured → plain local downgrade (demo mode).
  if (!stripe) {
    await setUserPlan(user.uid, "free");
    await syncUserQuotas(user.uid, "free").catch(() => undefined);
    return NextResponse.json({ cancelled: false, downgraded: true });
  }

  const record = await getUser(user.uid);
  let cancelled = false;
  if (record?.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({
      customer: record.stripeCustomerId,
      status: "all",
      limit: 100,
    });
    const active = subs.data.filter((s) =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status)
    );
    for (const sub of active) {
      await stripe.subscriptions.cancel(sub.id);
      cancelled = true;
    }
  }

  // Downgrade locally immediately; the deleted webhook is the idempotent backup.
  await setUserPlan(user.uid, "free");
  await syncUserQuotas(user.uid, "free").catch(() => undefined);

  return NextResponse.json({ cancelled, downgraded: true });
});
