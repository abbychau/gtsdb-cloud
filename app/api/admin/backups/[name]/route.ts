import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import { handle, HttpError } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { deleteBackup, resolveBackupPath } from "@/lib/backup";

export const runtime = "nodejs";

export const GET = handle(
  async (req: NextRequest, { params }: { params: { name: string } }) => {
    await requireAdmin(req);
    const filePath = resolveBackupPath(params.name);
    if (!filePath) throw new HttpError(400, "Invalid backup name");

    const data = await fs.readFile(filePath).catch(() => null);
    if (!data) throw new HttpError(404, "Backup not found");

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${params.name}"`,
        "Cache-Control": "no-store",
      },
    });
  }
);

export const DELETE = handle(
  async (req: NextRequest, { params }: { params: { name: string } }) => {
    await requireAdmin(req);
    await deleteBackup(params.name);
    return NextResponse.json({ ok: true });
  }
);
