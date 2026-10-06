import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getUser, setUserPlan } from "@/lib/store";
import { getPlan, PLAN_ORDER } from "@/lib/plans";
import { syncUserQuotas } from "@/lib/gtsdb-server";
import { isStripeConfigured } from "@/lib/stripe";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const record = await getUser(user.uid);
  return NextResponse.json({
    user: record ?? {
      uid: user.uid,
      email: user.email,
      displayName: user.name,
      provider: user.provider,
    },
    plan: record?.plan ?? "free",
    limits: getPlan(record?.plan ?? "free"),
  });
});

export const PATCH = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = (await req.json().catch(() => ({}))) as { plan?: PlanId };
  if (!body.plan || !PLAN_ORDER.includes(body.plan)) {
    throw new HttpError(400, "Invalid plan");
  }

  // Self-serve plan changes are only allowed in demo mode (no Stripe wired
  // up). With real billing configured, plan changes must go through the
  // Stripe checkout flow — otherwise a client could upgrade to a paid plan
  // without paying.
  if (isStripeConfigured()) {
    throw new HttpError(
      403,
      "Self-serve plan changes are disabled when billing is enabled — use the Stripe checkout to upgrade or cancel your subscription."
    );
  }

  const record = await getUser(user.uid);
  if (!record) throw new HttpError(404, "User record not found");

  const updated = await setUserPlan(user.uid, body.plan);
  // Push the new plan's storage cap to the user's tenants on the shared server.
  void syncUserQuotas(user.uid, body.plan).catch(() => undefined);
  return NextResponse.json({
    user: updated,
    plan: updated.plan,
    limits: getPlan(updated.plan),
  });
});
