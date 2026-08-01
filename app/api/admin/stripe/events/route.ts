import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { handle } from "@/lib/route-utils";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { listAllUsers } from "@/lib/store";

export const runtime = "nodejs";

// Recent Stripe webhook/API events, newest first. Admin-only. Each event is
// linked back to its platform user via the Stripe customer id (cus_...).
export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  if (!isStripeConfigured()) {
    return NextResponse.json({ enabled: false, events: [] });
  }

  // Map Stripe customer id -> platform user so events can be resolved to a user.
  const users = await listAllUsers();
  const customerToUser = new Map<
    string,
    { uid: string; email: string | null; name: string | null }
  >();
  for (const u of users) {
    if (u.stripeCustomerId)
      customerToUser.set(u.stripeCustomerId, {
        uid: u.uid,
        email: u.email,
        name: u.displayName,
      });
  }

  const stripe = getStripe()!;
  const events = await stripe.events.list({ limit: 50 });

  return NextResponse.json({
    enabled: true,
    events: events.data.map((e) => {
      const object = e.data?.object as
        | { customer?: string | null; id?: string }
        | undefined;
      // Most events carry the customer on data.object.customer; customer.*
      // events have it as the object id itself.
      const customerId =
        (typeof object?.customer === "string" && object.customer) ||
        (e.type.startsWith("customer.") ? (object?.id ?? null) : null);
      const user = customerId ? customerToUser.get(customerId) ?? null : null;
      return {
        id: e.id,
        type: e.type,
        created: new Date(e.created * 1000).toISOString(),
        apiVersion: e.api_version,
        objectId: object?.id ?? null,
        customerId,
        user,
      };
    }),
  });
});
