import { NextResponse, type NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { createBackup } from "@/lib/backup";

export const runtime = "nodejs";

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const info = await createBackup();
  return NextResponse.json(info, { status: 201 });
});
