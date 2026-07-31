import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getUser } from "@/lib/store";
import { getPortalPublicUrl } from "@/lib/gtsdb-config";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!isStripeConfigured()) {
    throw new HttpError(503, "Billing is not configured on this deployment.");
  }

  const record = await getUser(user.uid);
  if (!record?.stripeCustomerId) {
    throw new HttpError(400, "No billing customer yet — upgrade to a paid plan first.");
  }

  const stripe = getStripe()!;
  // Public, browser-reachable origin — NOT req.nextUrl.origin (see checkout).
  const origin = getPortalPublicUrl() || req.nextUrl.origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: `${origin}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
});
