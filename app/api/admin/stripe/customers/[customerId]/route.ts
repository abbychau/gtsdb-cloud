import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { handle, HttpError } from "@/lib/route-utils";
import { getActiveSubscription, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Admin action on a user's subscription: cancel (schedule at period end) or
// reactivate (resume billing). Admin-only.
export const POST = handle(
  async (req: NextRequest, ctx: { params: { customerId: string } }) => {
    await requireAdmin(req);
    const { customerId } = ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "cancel" && body.action !== "reactivate") {
      throw new HttpError(400, "action must be 'cancel' or 'reactivate'");
    }
    const stripe = getStripe();
    if (!stripe) throw new HttpError(503, "Billing is not configured");

    const sub = await getActiveSubscription(stripe, customerId);
    if (!sub) throw new HttpError(404, "No active subscription for this customer");

    if (body.action === "cancel") {
      if (!sub.cancelAtPeriodEnd) {
        await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
      }
    } else if (sub.cancelAtPeriodEnd) {
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    }

    const updated = await getActiveSubscription(stripe, customerId);
    return NextResponse.json({ ok: true, subscription: updated });
  }
);
