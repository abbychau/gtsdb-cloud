import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getInstance, touchInstance } from "@/lib/store";
import { callGtsdb } from "@/lib/gtsdb-server";
import { simulateOperation } from "@/lib/simulate";
import type { GtsdbResponse } from "@/lib/types";

export const runtime = "nodejs";

const WRITE_OPS = new Set([
  "write",
  "batch-write",
  "data-patch",
  "initkey",
  "renamekey",
  "deletekey",
  "reloadkey",
  "compact",
  "deleteDataPoint",
  "flush",
]);

export const POST = handle(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await requireUser(req);
    const inst = await getInstance(params.id);
    if (!inst) throw new HttpError(404, "Instance not found");
    if (inst.ownerUid !== user.uid) throw new HttpError(403, "Forbidden");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !("operation" in body)) {
      throw new HttpError(400, "Invalid GTSDB operation payload");
    }

    const operationName = String((body as { operation?: string }).operation || "")
      .toLowerCase();
    const isWrite = WRITE_OPS.has(operationName);

    // 1. Try the live GTSDB endpoint first.
    if (inst.endpoint) {
      const result = await callGtsdb(inst.endpoint, inst.token, body);
      if (result.ok) {
        const gtsdb = result.data as GtsdbResponse;
        await touchInstance(
          inst.id,
          isWrite ? { writes: 1 } : { reads: 1 },
          "active"
        );
        return NextResponse.json(gtsdb);
      }
      if (result.status === 401) {
        await touchInstance(inst.id, undefined, "offline");
        return NextResponse.json(
          {
            success: false,
            message:
              "GTSDB rejected the instance token (401 Unauthorized). Check the token in Settings.",
          },
          { status: 502 }
        );
      }
    }

    // 2. Fall back to the built-in simulator when enabled.
    if (inst.simulate) {
      const simulated = simulateOperation(inst.id, body);
      await touchInstance(inst.id, isWrite ? { writes: 1 } : { reads: 1 });
      return NextResponse.json(simulated);
    }

    // 3. Report the connectivity problem.
    return NextResponse.json(
      {
        success: false,
        message: `Unable to reach GTSDB at ${inst.endpoint || "(no endpoint)"}. Verify the endpoint + token, or enable simulation.`,
      },
      { status: 502 }
    );
  }
);
