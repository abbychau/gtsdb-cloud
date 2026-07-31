import { NextResponse, type NextRequest } from "next/server";
import { requireUser, handle, HttpError } from "@/lib/route-utils";
import {
  createInstance,
  getUser,
  listAllInstances,
  listInstances,
} from "@/lib/store";
import { canCreateInstance, getPlan } from "@/lib/plans";
import { checkHealth, provisionGtsdbUser } from "@/lib/gtsdb-server";
import {
  getGtsdbBase,
  getPublicHttpUrl,
  getPublicTcpUrl,
} from "@/lib/gtsdb-config";
import { generateConnectionToken, slugify, uniqueSlug } from "@/lib/utils";
import type {
  CreateInstanceInput,
  InstanceRegion,
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
  return NextResponse.json({
    instances,
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
  if (!canCreateInstance(plan, existing.length)) {
    throw new HttpError(
      402,
      `Your ${getPlan(plan).name} plan allows up to ${getPlan(plan).maxInstances} instance(s). Upgrade to create more.`
    );
  }

  const region: InstanceRegion = body.region && REGIONS.includes(body.region)
    ? body.region
    : "auto";
  const simulate = body.simulate !== false;

  const id = `ins_${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 4)}`;
  const now = new Date().toISOString();

  const slug = uniqueSlug(slugify(name), (await listAllInstances()).map((i) => i.slug));

  // Provision a real tenant namespace on the shared, multi-tenant GTSDB server.
  // Each instance = one GTSDB user; its token scopes every request to that
  // namespace (isolation is enforced server-side by GTSDB).
  const endpoint = getGtsdbBase();
  const connectionString = getPublicHttpUrl();
  const tcpConnectionString = getPublicTcpUrl();
  const provision = await provisionGtsdbUser(id);
  const token = provision.ok ? provision.token : generateConnectionToken();
  const healthy = provision.ok || (await checkHealth(endpoint));
  const status = provision.ok || healthy || simulate ? "active" : "offline";

  const instance: PlatformInstance = {
    id,
    ownerUid: user.uid,
    name,
    slug,
    region,
    plan,
    status,
    endpoint,
    namespace: id,
    token,
    connectionString,
    tcpConnectionString,
    simulate,
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
