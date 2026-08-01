import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getInstance, updateInstance } from "@/lib/store";
import { rotateGtsdbUserToken } from "@/lib/gtsdb-server";
import { generateConnectionToken } from "@/lib/utils";

export const runtime = "nodejs";

async function ownedInstance(id: string, uid: string) {
  const inst = await getInstance(id);
  if (!inst) throw new HttpError(404, "Instance not found");
  if (inst.ownerUid !== uid) throw new HttpError(403, "Forbidden");
  return inst;
}

/**
 * POST — rotate the connection credential.
 * Calls GTSDB `resetkey` for the tenant namespace (which immediately
 * invalidates the previous token).
 */
export const POST = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    const inst = await ownedInstance(params.id, user.uid);

    let token: string;
    if (inst.namespace) {
      const rotated = await rotateGtsdbUserToken(inst.namespace);
      if (!rotated.ok) throw new HttpError(502, rotated.error);
      token = rotated.token;
    } else {
      token = generateConnectionToken();
    }

    const updated = await updateInstance(params.id, { token });
    return NextResponse.json(updated);
  }
);
