import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { listAllInstances, listAllUsers } from "@/lib/store";

export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const instances = await listAllInstances();
  const users = await listAllUsers();
  const emailByUid = new Map(users.map((u) => [u.uid, u.email]));

  const rows = instances
    .map((i) => ({
      ...i,
      ownerEmail: emailByUid.get(i.ownerUid) ?? null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(rows);
});
