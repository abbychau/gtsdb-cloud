import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle } from "@/lib/route-utils";
import { getUser } from "@/lib/store";
import { getActiveSubscription, getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Current Stripe subscription state for the authenticated user. The billing
// page uses this to show cancellation / period-end / reactivate messaging.
export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!isStripeConfigured()) {
    return NextResponse.json({ enabled: false, subscription: null });
  }
  const stripe = getStripe()!;
  const record = await getUser(user.uid);
  if (!record?.stripeCustomerId) {
    return NextResponse.json({ enabled: true, subscription: null });
  }
  const subscription = await getActiveSubscription(stripe, record.stripeCustomerId);
  return NextResponse.json({ enabled: true, subscription });
});
