import { NextResponse, type NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { deleteInstance, getInstance, updateInstance } from "@/lib/store";
import { PLAN_ORDER } from "@/lib/plans";
import type { InstanceStatus, PlanId } from "@/lib/types";

export const runtime = "nodejs";

const STATUSES: InstanceStatus[] = [
  "provisioning",
  "active",
  "offline",
  "suspended",
];

export const PATCH = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin(req);
    const inst = await getInstance(params.id);
    if (!inst) throw new HttpError(404, "Instance not found");

    const body = (await req.json().catch(() => ({}))) as {
      plan?: PlanId;
      status?: InstanceStatus;
      simulate?: boolean;
    };

    const patch: { plan?: PlanId; status?: InstanceStatus; simulate?: boolean } = {};
    if (body.plan !== undefined) {
      if (!PLAN_ORDER.includes(body.plan)) throw new HttpError(400, "Invalid plan");
      patch.plan = body.plan;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) throw new HttpError(400, "Invalid status");
      patch.status = body.status;
    }
    if (body.simulate !== undefined) patch.simulate = Boolean(body.simulate);

    const updated = await updateInstance(params.id, patch);
    return NextResponse.json(updated);
  }
);

export const DELETE = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin(req);
    const inst = await getInstance(params.id);
    if (!inst) throw new HttpError(404, "Instance not found");

    await deleteInstance(params.id);
    return NextResponse.json({ ok: true });
  }
);
