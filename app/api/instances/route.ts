import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import {
  createInstance,
  getUser,
  listAllInstances,
  listInstances,
  updateInstance,
} from "@/lib/store";
import { canCreateExternalInstance, canCreateInstance, getPlan } from "@/lib/plans";
import { callGtsdb, checkHealth, normalizeEndpoint, provisionGtsdbUser } from "@/lib/gtsdb-server";
import {
  getGtsdbBase,
  getPublicHttpUrl,
  getPublicTcpUrl,
} from "@/lib/gtsdb-config";
import { ops, readKeyCounts } from "@/lib/gtsdb";
import { generateConnectionToken, slugify, uniqueSlug } from "@/lib/utils";
import type {
  CreateInstanceInput,
  GtsdbResponse,
  InstanceRegion,
  InstanceStatus,
  PlatformInstance,
} from "@/lib/types";

export const runtime = "nodejs";

const REGIONS: InstanceRegion[] = [
  "auto",
  "asia-east1",
  "asia-northeast1",
  "europe-west1",
  "us-central1",
  "us-east1",
  "local",
];

const NAME_RE = /^[\w\s\-.]{2,40}$/;

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const instances = await listInstances(user.uid);
  const record = await getUser(user.uid);

  // Reconcile usage against each instance's live server so the overview / cards
  // show real keys & points (the stored counters only track platform proxy
  // traffic, not data written directly to GTSDB).
  const base = getGtsdbBase();
  let liveInstances = instances;
  if (await checkHealth(base)) {
    liveInstances = await Promise.all(
      instances.map(async (inst) => {
        // Self-hosted instances point at the user's own server; managed ones
        // use the shared base. Instances without a token are skipped.
        const endpoint = inst.external ? inst.endpoint : base;
        if (!endpoint || !inst.token) return inst;
        const res = await callGtsdb(endpoint, inst.token, ops.ownIdsWithCount());
        if (!res.ok) return inst;
        const counts = readKeyCounts(res.data as GtsdbResponse);
        const keys = counts.length;
        const points = counts.reduce((sum, c) => sum + c.count, 0);
        const usage = { ...inst.usage, keys, points };
        // Persist the reconciled snapshot (set, not increment).
        void updateInstance(inst.id, { usage }).catch(() => undefined);
        return { ...inst, usage };
      })
    );
  }

  return NextResponse.json({
    instances: liveInstances,
    plan: record?.plan ?? "free",
    limits: getPlan(record?.plan ?? "free"),
  });
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const record = await getUser(user.uid);
  if (!record) throw new HttpError(404, "User record not found");

  const body = (await req.json().catch(() => ({}))) as CreateInstanceInput;

  const name = (body.name || "").trim();
  if (!name) throw new HttpError(400, "Instance name is required");
  if (!NAME_RE.test(name)) {
    throw new HttpError(400, "Name must be 2-40 chars: letters, numbers, spaces, - . _");
  }

  const plan = record.plan ?? "free";
  const existing = await listInstances(user.uid);
  const planDef = getPlan(plan);

  // "Connect my own GTSDB": the user supplies an IP/domain (+ optional token)
  // and the platform proxies to their server instead of provisioning a tenant
  // on the shared managed server.
  const external = Boolean(body.endpoint?.trim());

  if (external) {
    const extCount = existing.filter((i) => i.external).length;
    if (!canCreateExternalInstance(plan, extCount)) {
      throw new HttpError(
        402,
        `Your ${planDef.name} plan allows up to ${planDef.maxExternalInstances} self-hosted connection(s). Upgrade to add more.`
      );
    }
  } else if (!canCreateInstance(plan, existing.filter((i) => !i.external).length)) {
    throw new HttpError(
      402,
      `Your ${planDef.name} plan allows up to ${planDef.maxInstances} instance(s). Upgrade to create more.`
    );
  }

  const region: InstanceRegion = body.region && REGIONS.includes(body.region)
    ? body.region
    : "auto";

  const id = `ins_${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 4)}`;
  const now = new Date().toISOString();

  const slug = uniqueSlug(slugify(name), (await listAllInstances()).map((i) => i.slug));

  // Upstream endpoint: the shared managed server, or the user's own GTSDB.
  const endpoint = external ? normalizeEndpoint(body.endpoint!) : getGtsdbBase();
  if (external && !endpoint) {
    throw new HttpError(400, "A valid GTSDB address (IP or domain) is required");
  }

  let token: string;
  let namespace: string;
  let connectionString: string;
  let tcpConnectionString: string;
  let status: InstanceStatus;

  if (external) {
    // Self-hosted: no tenant provisioning — the platform just proxies to the
    // user's server using their (optional) token.
    token = (body.token || "").trim();
    namespace = "";
    connectionString = endpoint;
    tcpConnectionString = "";
    status = (await checkHealth(endpoint)) ? "active" : "offline";
  } else {
    // Provision a real tenant namespace on the shared, multi-tenant GTSDB
    // server. Each instance = one GTSDB user; its token scopes every request
    // to that namespace (isolation is enforced server-side by GTSDB).
    connectionString = getPublicHttpUrl();
    tcpConnectionString = getPublicTcpUrl();
    const provision = await provisionGtsdbUser(id, planDef.maxPoints);
    token = provision.ok ? provision.token : generateConnectionToken();
    namespace = id;
    const healthy = provision.ok || (await checkHealth(endpoint));
    status = provision.ok || healthy ? "active" : "offline";
  }

  const instance: PlatformInstance = {
    id,
    ownerUid: user.uid,
    name,
    slug,
    region,
    plan,
    status,
    endpoint,
    namespace,
    token,
    external,
    connectionString,
    tcpConnectionString,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    lastHealthyAt: status === "active" ? now : null,
    serverInfo: null,
    usage: { points: 0, keys: 0, reads: 0, writes: 0 },
  };

  await createInstance(instance);
  return NextResponse.json(instance, { status: 201 });
});
