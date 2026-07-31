// A tiny, dependency-free file-backed store used by the platform API routes.
//
// Data is persisted to ./data/platform.json (git-ignored). This is perfect for
// local / single-node deployments. For serverless deployments where the file
// system is ephemeral, swap `load`/`save` for a real database (Prisma, Drizzle,
// Supabase, etc.) — the rest of the API layer is storage-agnostic.

import { promises as fs } from "fs";
import path from "path";
import type {
  InstanceStatus,
  PlatformInstance,
  PlatformUser,
  ServerInfo,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "platform.json");

interface StoreShape {
  users: Record<string, PlatformUser>;
  instances: Record<string, PlatformInstance>;
}

let cache: StoreShape | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function load(): Promise<StoreShape> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    cache = {
      users: parsed.users ?? {},
      instances: parsed.instances ?? {},
    };
  } catch {
    cache = { users: {}, instances: {} };
  }
  return cache;
}

async function save(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache, null, 2), "utf8");
  await fs.rename(tmp, STORE_FILE);
}

/** Serialise mutations so concurrent API calls never corrupt the file. */
function mutate<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

// --- Users -----------------------------------------------------------------

export async function getUser(uid: string): Promise<PlatformUser | null> {
  const store = await load();
  return store.users[uid] ?? null;
}

export async function upsertUser(user: {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  provider: "firebase" | "demo";
}): Promise<PlatformUser> {
  return mutate(async () => {
    const store = await load();
    const existing = store.users[user.uid];
    const now = new Date().toISOString();
    const record: PlatformUser = existing ?? {
      uid: user.uid,
      email: user.email ?? `${user.uid}@unknown`,
      displayName: user.name,
      photoURL: user.photoURL,
      provider: user.provider,
      plan: "free",
      createdAt: now,
      lastSeenAt: now,
    };
    // Keep profile fields fresh, but never downgrade/upgrade the plan here.
    record.email = user.email ?? record.email;
    record.displayName = user.name ?? record.displayName;
    record.photoURL = user.photoURL ?? record.photoURL;
    record.provider = user.provider;
    record.lastSeenAt = now;
    store.users[user.uid] = record;
    await save();
    return record;
  });
}

export async function setUserPlan(
  uid: string,
  plan: PlatformUser["plan"]
): Promise<PlatformUser> {
  return mutate(async () => {
    const store = await load();
    const user = store.users[uid];
    if (!user) throw new Error("User not found");
    user.plan = plan;
    await save();
    return user;
  });
}

// --- Instances -------------------------------------------------------------

export async function listInstances(uid: string): Promise<PlatformInstance[]> {
  const store = await load();
  return Object.values(store.instances)
    .filter((i) => i.ownerUid === uid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInstance(
  id: string
): Promise<PlatformInstance | null> {
  const store = await load();
  return store.instances[id] ?? null;
}

export async function createInstance(
  inst: PlatformInstance
): Promise<PlatformInstance> {
  return mutate(async () => {
    const store = await load();
    store.instances[inst.id] = inst;
    await save();
    return inst;
  });
}

export async function updateInstance(
  id: string,
  patch: Partial<PlatformInstance>
): Promise<PlatformInstance> {
  return mutate(async () => {
    const store = await load();
    const inst = store.instances[id];
    if (!inst) throw new Error("Instance not found");
    Object.assign(inst, patch, {
      updatedAt: new Date().toISOString(),
    });
    await save();
    return inst;
  });
}

export async function deleteInstance(id: string): Promise<void> {
  return mutate(async () => {
    const store = await load();
    delete store.instances[id];
    await save();
  });
}

export async function touchInstance(
  id: string,
  usage?: { reads?: number; writes?: number },
  status?: InstanceStatus,
  serverInfo?: ServerInfo | null
): Promise<PlatformInstance> {
  return mutate(async () => {
    const store = await load();
    const inst = store.instances[id];
    if (!inst) return inst;
    inst.lastActiveAt = new Date().toISOString();
    if (usage?.reads) inst.usage.reads += usage.reads;
    if (usage?.writes) inst.usage.writes += usage.writes;
    if (status) inst.status = status;
    if (serverInfo !== undefined) inst.serverInfo = serverInfo;
    if (status === "active") inst.lastHealthyAt = new Date().toISOString();
    inst.updatedAt = new Date().toISOString();
    await save();
    return inst;
  });
}

// --- Stats -----------------------------------------------------------------

export async function platformStats(): Promise<{
  users: number;
  instances: number;
}> {
  const store = await load();
  return {
    users: Object.keys(store.users).length,
    instances: Object.keys(store.instances).length,
  };
}
