import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { handle } from "@/lib/route-utils";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Recent Stripe webhook/API events, newest first. Admin-only.
export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  if (!isStripeConfigured()) {
    return NextResponse.json({ enabled: false, events: [] });
  }
  const stripe = getStripe()!;
  const events = await stripe.events.list({ limit: 50 });
  return NextResponse.json({
    enabled: true,
    events: events.data.map((e) => ({
      id: e.id,
      type: e.type,
      created: new Date(e.created * 1000).toISOString(),
      apiVersion: e.api_version,
      objectId: (e.data?.object as { id?: string } | undefined)?.id ?? null,
    })),
  });
});
