import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getUser, setUserPlan } from "@/lib/store";
import { getPlan, PLAN_ORDER } from "@/lib/plans";
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
  const record = await getUser(user.uid);
  if (!record) throw new HttpError(404, "User record not found");

  // Demo billing gate: allow switching freely in demo mode so the freemium
  // flow can be explored. In a real deployment this is where a payment
  // provider (Stripe etc.) would be wired in.
  const updated = await setUserPlan(user.uid, body.plan);
  return NextResponse.json({
    user: updated,
    plan: updated.plan,
    limits: getPlan(updated.plan),
  });
});
