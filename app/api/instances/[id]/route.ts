import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import {
  deleteInstance,
  getInstance,
  updateInstance,
} from "@/lib/store";
import { checkHealth } from "@/lib/gtsdb-server";
import type { UpdateInstanceInput } from "@/lib/types";

export const runtime = "nodejs";

async function ownedInstance(id: string, uid: string) {
  const inst = await getInstance(id);
  if (!inst) throw new HttpError(404, "Instance not found");
  if (inst.ownerUid !== uid) throw new HttpError(403, "Forbidden");
  return inst;
}

export const GET = handle(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser(req);
  const inst = await ownedInstance(params.id, user.uid);
  return NextResponse.json(inst);
});

export const PATCH = handle(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser(req);
  const inst = await ownedInstance(params.id, user.uid);

  const body = (await req.json().catch(() => ({}))) as UpdateInstanceInput;

  const patch: Partial<typeof inst> = {};

  if (body.name !== undefined) {
    const name = (body.name || "").trim();
    if (name.length < 2 || name.length > 40) {
      throw new HttpError(400, "Name must be 2-40 characters");
    }
    patch.name = name;
  }
  if (body.region !== undefined) patch.region = body.region;
  if (body.endpoint !== undefined) {
    patch.endpoint = (body.endpoint || "").trim();
    patch.serverInfo = null;
  }
  if (body.token !== undefined) patch.token = (body.token || "").trim();
  if (body.simulate !== undefined) patch.simulate = body.simulate;

  // Re-run the health check when the endpoint changed so the status is fresh.
  if (body.endpoint !== undefined || body.status !== undefined) {
    const healthy = await checkHealth(patch.endpoint ?? inst.endpoint);
    patch.status = healthy ? "active" : patch.simulate ?? inst.simulate ? "provisioning" : "offline";
    if (healthy) patch.lastHealthyAt = new Date().toISOString();
    else patch.lastHealthyAt = null;
  }

  const updated = await updateInstance(params.id, patch);
  return NextResponse.json(updated);
});

export const DELETE = handle(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser(req);
  await ownedInstance(params.id, user.uid);
  await deleteInstance(params.id);
  return NextResponse.json({ ok: true });
});
