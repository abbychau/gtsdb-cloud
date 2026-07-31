import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { listAllInstances, listAllUsers } from "@/lib/store";

export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const users = await listAllUsers();
  const instances = await listAllInstances();

  const countByOwner = new Map<string, number>();
  for (const i of instances) {
    countByOwner.set(i.ownerUid, (countByOwner.get(i.ownerUid) ?? 0) + 1);
  }

  const rows = users.map((u) => ({
    ...u,
    instanceCount: countByOwner.get(u.uid) ?? 0,
  }));

  return NextResponse.json(rows);
});
