import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getInstance, touchInstance } from "@/lib/store";
import { callGtsdb, checkHealth } from "@/lib/gtsdb-server";
import {
  readKeyCounts,
  readKeys,
  readServerInfo,
  ops,
} from "@/lib/gtsdb";
import type { GtsdbResponse } from "@/lib/types";

export const runtime = "nodejs";

export const GET = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    const inst = await getInstance(params.id);
    if (!inst) throw new HttpError(404, "Instance not found");
    if (inst.ownerUid !== user.uid) throw new HttpError(403, "Forbidden");

    const healthy = await checkHealth(inst.endpoint);

    if (healthy) {
      const [infoRes, idsRes, countsRes] = await Promise.all([
        callGtsdb(inst.endpoint, inst.token, ops.serverInfo()),
        callGtsdb(inst.endpoint, inst.token, ops.ids()),
        callGtsdb(inst.endpoint, inst.token, ops.idsWithCount()),
      ]);
      const serverInfo = readServerInfo(infoRes.data as GtsdbResponse);
      const keys = readKeys(idsRes.data as GtsdbResponse);
      const counts = readKeyCounts(countsRes.data as GtsdbResponse);
      const points = counts.reduce((sum, c) => sum + c.count, 0);

      const usage = { ...inst.usage, keys: keys.length, points };

      await touchInstance(
        inst.id,
        {},
        "active",
        serverInfo ?? inst.serverInfo
      );
      return NextResponse.json({
        usage,
        serverInfo: serverInfo ?? inst.serverInfo ?? null,
        status: "active",
      });
    }

    await touchInstance(inst.id, {}, "offline", inst.serverInfo);
    return NextResponse.json({
      usage: inst.usage,
      serverInfo: inst.serverInfo ?? null,
      status: "offline",
    });
  }
);
