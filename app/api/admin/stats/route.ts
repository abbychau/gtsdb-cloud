import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/route-utils";
import { requireAdmin } from "@/lib/admin-server";
import { listAllInstances, listAllUsers } from "@/lib/store";

export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const users = await listAllUsers();
  const instances = await listAllInstances();

  const planDistribution = { free: 0, pro: 0, team: 0 };
  for (const u of users) {
    planDistribution[u.plan] = (planDistribution[u.plan] ?? 0) + 1;
  }

  const sum = (fn: (i: (typeof instances)[number]) => number) =>
    instances.reduce((s, i) => s + fn(i), 0);

  return NextResponse.json({
    totalUsers: users.length,
    totalInstances: instances.length,
    activeInstances: instances.filter((i) => i.status === "active").length,
    totalPoints: sum((i) => i.usage.points),
    totalKeys: sum((i) => i.usage.keys),
    totalReads: sum((i) => i.usage.reads),
    totalWrites: sum((i) => i.usage.writes),
    planDistribution,
  });
});
