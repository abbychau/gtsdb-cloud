import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { setUserPlan, setUserStripeCustomer } from "@/lib/store";
import { syncUserQuotas } from "@/lib/gtsdb-server";
import { getStripe, getStripeWebhookSecret, isStripeConfigured } from "@/lib/stripe";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Never hard-fail the Stripe caller when billing is not wired up yet.
  if (!isStripeConfigured()) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe()!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.uid;
      const plan = session.metadata?.plan as PlanId | undefined;
      if (uid && plan) {
        if (session.customer) await setUserStripeCustomer(uid, String(session.customer));
        await setUserPlan(uid, plan);
        // Best-effort engine quota sync (no-op if GTSDB is down).
        await syncUserQuotas(uid, plan).catch(() => undefined);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata?.uid ?? (await lookupUidFromCustomer(String(sub.customer)));
      if (uid) {
        await setUserPlan(uid, "free");
        await syncUserQuotas(uid, "free").catch(() => undefined);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function lookupUidFromCustomer(customerId: string): Promise<string | null> {
  // We always store the uid in the customer's metadata at creation time.
  const stripe = getStripe()!;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.uid ?? null;
}
