import { NextResponse, type NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { deleteUser, getUser, setUserPlan } from "@/lib/store";
import { PLAN_ORDER } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export const PATCH = handle(
  async (req: NextRequest, { params }: { params: { uid: string } }) => {
    await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as { plan?: PlanId };

    if (!PLAN_ORDER.includes(body.plan as PlanId)) {
      throw new HttpError(400, "Invalid plan");
    }
    const existing = await getUser(params.uid);
    if (!existing) throw new HttpError(404, "User not found");

    const updated = await setUserPlan(params.uid, body.plan as PlanId);
    return NextResponse.json(updated);
  }
);

export const DELETE = handle(
  async (req: NextRequest, { params }: { params: { uid: string } }) => {
    await requireAdmin(req);
    const existing = await getUser(params.uid);
    if (!existing) throw new HttpError(404, "User not found");

    await deleteUser(params.uid);
    return NextResponse.json({ ok: true });
  }
);
