import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getInstance, updateInstance } from "@/lib/store";
import { generateConnectionToken } from "@/lib/utils";

export const runtime = "nodejs";

async function ownedInstance(id: string, uid: string) {
  const inst = await getInstance(id);
  if (!inst) throw new HttpError(404, "Instance not found");
  if (inst.ownerUid !== uid) throw new HttpError(403, "Forbidden");
  return inst;
}

/**
 * POST — regenerate (rotate) the instance connection credential.
 * DELETE — revoke the connection credential (clears it).
 */
export const POST = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    await ownedInstance(params.id, user.uid);
    const token = generateConnectionToken();
    const updated = await updateInstance(params.id, { token });
    return NextResponse.json(updated);
  }
);

export const DELETE = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    await ownedInstance(params.id, user.uid);
    const updated = await updateInstance(params.id, { token: "" });
    return NextResponse.json(updated);
  }
);
