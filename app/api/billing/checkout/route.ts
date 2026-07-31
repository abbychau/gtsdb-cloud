import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getUser, setUserPlan, setUserStripeCustomer } from "@/lib/store";
import { getPortalPublicUrl } from "@/lib/gtsdb-config";
import { syncUserQuotas } from "@/lib/gtsdb-server";
import { PLAN_ORDER } from "@/lib/plans";
import { getActiveSubscription, getPriceId, getStripe, isStripeConfigured } from "@/lib/stripe";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!isStripeConfigured()) {
    throw new HttpError(503, "Billing is not configured on this deployment.");
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: PlanId };
  const plan = body.plan && PLAN_ORDER.includes(body.plan) ? body.plan : "pro";
  const priceId = getPriceId(plan);
  if (!priceId) {
    throw new HttpError(
      400,
      `No Stripe price configured for the ${plan} plan. Set STRIPE_PRICE_${plan.toUpperCase()} in .env.local.`
    );
  }

  const stripe = getStripe()!;
  const record = await getUser(user.uid);

  // Reuse (or create) the Stripe customer for this platform user.
  let customerId = record?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { uid: user.uid },
    });
    customerId = customer.id;
    await setUserStripeCustomer(user.uid, customerId);
  }

  // Public, browser-reachable origin — NOT req.nextUrl.origin (behind the
  // Cloudflare tunnel that resolves to http://0.0.0.0:13000).
  const origin = getPortalPublicUrl() || req.nextUrl.origin;

  const active = await getActiveSubscription(stripe, customerId);
  if (active) {
    if (active.cancelAtPeriodEnd) {
      // Scheduled to cancel at period end → reactivate and resume billing
      // instead of creating a duplicate subscription (no double charge).
      await stripe.subscriptions.update(active.id, { cancel_at_period_end: false });
      await setUserPlan(user.uid, plan);
      await syncUserQuotas(user.uid, plan).catch(() => undefined);
      return NextResponse.json({ reactivated: true });
    }
    // Already on a paid subscription — route plan changes through the portal so
    // Stripe prorates instead of stacking a second subscription.
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`,
    });
    return NextResponse.json({ url: portal.url, portal: true });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { uid: user.uid, plan },
    // Stamp the uid/plan onto the Subscription itself (not just the session)
    // so webhook events like customer.subscription.deleted can resolve the
    // platform user directly from sub.metadata.uid without a customer lookup.
    subscription_data: { metadata: { uid: user.uid, plan } },
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?cancel=1`,
    // Make sure the plan id is reflected so downgrades/upgrades match the UI.
    client_reference_id: user.uid,
  });

  return NextResponse.json({ url: session.url });
});
