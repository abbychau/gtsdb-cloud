import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import { getInstance, touchInstance } from "@/lib/store";
import { callGtsdb } from "@/lib/gtsdb-server";
import { simulateOperation } from "@/lib/simulate";
import { getPlan } from "@/lib/plans";
import type { GtsdbResponse, PlatformInstance } from "@/lib/types";

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

interface IncomingImpact {
  points: number;
  newKeys: number;
}

/** Estimate how much a request grows the instance (points written / keys created). */
function incomingImpact(body: Record<string, unknown>): IncomingImpact {
  const op = String(body.operation || "").toLowerCase();
  switch (op) {
    case "write":
      return { points: 1, newKeys: 0 };
    case "batch-write": {
      const pts = Array.isArray(body.points) ? (body.points as Array<{ key?: string }>) : [];
      return { points: pts.length, newKeys: 0 };
    }
    case "data-patch": {
      const lines = String(body.data || "")
        .trim()
        .split(/\r?\n/)
        .filter((l) => l.trim());
      return { points: lines.length, newKeys: 0 };
    }
    case "initkey":
      return { points: 0, newKeys: 1 };
    default:
      return { points: 0, newKeys: 0 };
  }
}

/** Reject a request that would exceed the instance's plan quota. */
function quotaViolation(inst: PlatformInstance, impact: IncomingImpact): string | null {
  const plan = getPlan(inst.plan);
  if (impact.points > 0 && inst.usage.points + impact.points > plan.maxPoints) {
    return `Data point quota exceeded for the ${plan.name} plan (${plan.maxPoints.toLocaleString()} pts/mo). Upgrade to keep writing.`;
  }
  if (impact.newKeys > 0 && inst.usage.keys + impact.newKeys > plan.maxKeysPerInstance) {
    return `Series quota exceeded for the ${plan.name} plan (${plan.maxKeysPerInstance} keys). Delete a key or upgrade.`;
  }
  return null;
}

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

    // Enforce the freemium quota before anything is written.
    const impact = incomingImpact(body as Record<string, unknown>);
    const violation = quotaViolation(inst, impact);
    if (violation) {
      return NextResponse.json(
        { success: false, message: violation },
        { status: 402 }
      );
    }

    // 1. Try the live GTSDB endpoint first.
    if (inst.endpoint) {
      const result = await callGtsdb(inst.endpoint, inst.token, body);
      if (result.ok) {
        const gtsdb = result.data as GtsdbResponse;
        await touchInstance(
          inst.id,
          isWrite
            ? { writes: 1, points: impact.points, keys: impact.newKeys }
            : { reads: 1 },
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
              "GTSDB rejected the connection credential (401 Unauthorized). Check the credential in the Connection tab.",
          },
          { status: 502 }
        );
      }
    }

    // 2. Fall back to the built-in simulator when enabled (instance stays active).
    if (inst.simulate) {
      const simulated = simulateOperation(inst.id, body);
      await touchInstance(
        inst.id,
        isWrite
          ? { writes: 1, points: impact.points, keys: impact.newKeys }
          : { reads: 1 },
        "active"
      );
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
