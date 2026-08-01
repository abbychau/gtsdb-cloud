import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { restoreBackup } from "@/lib/backup";

export const runtime = "nodejs";

export const POST = handle(
  async (req: NextRequest, { params }: { params: { name: string } }) => {
    await requireAdmin(req);
    const result = await restoreBackup(params.name);
    return NextResponse.json(result);
  }
);
