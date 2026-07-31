import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { callGtsdb } from "@/lib/gtsdb-server";
import { getAdminToken, getGtsdbBase } from "@/lib/gtsdb-config";
import { maskToken } from "@/lib/utils";
import type { ServerInfo } from "@/lib/types";

export const runtime = "nodejs";

/** Parse a Prometheus text exposition into a name->value map. */
function parseMetrics(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+(-?[\d.eE+]+)\s*$/);
    if (m) {
      const v = parseFloat(m[2]);
      if (!Number.isNaN(v)) out[m[1]] = v;
    }
  }
  return out;
}

/** Recursively compute a directory's size and file count. */
async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  async function walk(p: string) {
    const entries = await fs.readdir(p, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        const st = await fs.stat(full).catch(() => null);
        if (st) {
          bytes += st.size;
          files++;
        }
      }
    }
  }
  await walk(dir);
  return { bytes, files };
}

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);

  const base = getGtsdbBase();
  const admin = getAdminToken();
  // The managed GTSDB runs from the repo root (parent of this Next.js app);
  // its data dir is <repo root>/data.
  const gtsdbRoot = path.resolve(process.cwd(), "..");
  const dataDir = path.join(gtsdbRoot, "data");

  let online = false;
  let metrics: Record<string, number> | null = null;
  let serverinfo: ServerInfo | null = null;

  try {
    const res = await fetch(`${base}/metrics`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      online = true;
      metrics = parseMetrics(await res.text());
    }
  } catch {
    // offline
  }

  if (online && admin) {
    const si = await callGtsdb(base, admin, { operation: "serverinfo" }, 5000);
    const data = si.data as { success?: boolean; data?: ServerInfo } | null;
    if (si.ok && data?.success && data.data) serverinfo = data.data;
  }

  let tenants: Array<{ name: string; isRoot: boolean; tokenMasked: string }> = [];
  try {
    const raw = await fs.readFile(path.join(dataDir, "users.json"), "utf8");
    const arr = JSON.parse(raw) as Array<{ name?: string; token?: string }>;
    tenants = arr.map((u) => ({
      name: u.name ?? "",
      isRoot: u.name === "root",
      tokenMasked: maskToken(u.token ?? ""),
    }));
  } catch {
    // no users file yet
  }

  const { bytes: dataDirBytes, files: dataDirFiles } = await dirSize(dataDir);

  return NextResponse.json({
    online,
    metrics,
    serverinfo,
    tenants,
    dataDir,
    dataDirBytes,
    dataDirFiles,
    checkedAt: new Date().toISOString(),
  });
});
