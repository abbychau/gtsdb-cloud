import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { listBackups } from "@/lib/backup";

export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  return NextResponse.json(await listBackups());
});
