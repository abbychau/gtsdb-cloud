// SQLite-backed store for the platform API routes.
//
// Data lives in ./data/platform.db (git-ignored), WAL journal mode. Legacy
// ./data/platform.json is auto-imported on first run. All exported functions
// keep the same async signatures as the previous file backend, so the rest of
// the API layer is unchanged. A small in-memory cache + serialised mutation
// queue avoid concurrent-write races.

import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { slugify } from "./utils";
import { getPublicHttpUrl, getPublicTcpUrl } from "./gtsdb-config";
import type {
  InstanceStatus,
  PlatformInstance,
  PlatformUser,
  ServerInfo,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "platform.db");
const LEGACY_FILE = path.join(DATA_DIR, "platform.json");

interface StoreShape {
  users: Record<string, PlatformUser>;
  instances: Record<string, PlatformInstance>;
}

let db: Database.Database | null = null;
let cache: StoreShape | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid  TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS instances (
      id  TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);
  migrateLegacy();
  return db;
}

/** Import an existing platform.json into SQLite once (first run). */
function migrateLegacy(): void {
  if (!db) return;
  const uCount = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  const iCount = (db.prepare("SELECT COUNT(*) AS c FROM instances").get() as { c: number }).c;
  if (uCount > 0 || iCount > 0) return;
  // Synchronous: this runs once at first access and must complete before any
  // loadStore() caches the (empty) store, otherwise the legacy data would be
  // lost until restart.
  let raw: string;
  try {
    raw = readFileSync(LEGACY_FILE, "utf8");
  } catch {
    return; // no legacy file — fresh start
  }
  let parsed: Partial<StoreShape>;
  try {
    parsed = JSON.parse(raw) as Partial<StoreShape>;
  } catch {
    return; // corrupt legacy file — ignore
  }
  const upsertU = db.prepare(
    "INSERT INTO users(uid,data) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data"
  );
  const upsertI = db.prepare(
    "INSERT INTO instances(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data"
  );
  const tx = db.transaction(() => {
    for (const u of Object.values(parsed.users ?? {})) upsertU.run(u.uid, JSON.stringify(u));
    for (const i of Object.values(parsed.instances ?? {})) upsertI.run(i.id, JSON.stringify(i));
  });
  tx();
  console.log(`[store] migrated ${Object.keys(parsed.users ?? {}).length} user(s) and ${Object.keys(parsed.instances ?? {}).length} instance(s) from platform.json`);
}

function loadStore(): StoreShape {
  if (cache) return cache;
  const d = getDb();
  const users: Record<string, PlatformUser> = {};
  const instances: Record<string, PlatformInstance> = {};
  for (const row of d.prepare("SELECT uid, data FROM users").all() as Array<{ uid: string; data: string }>) {
    try {
      users[row.uid] = JSON.parse(row.data);
    } catch {
      // skip corrupt row
    }
  }
  for (const row of d.prepare("SELECT id, data FROM instances").all() as Array<{ id: string; data: string }>) {
    try {
      instances[row.id] = JSON.parse(row.data);
    } catch {
      // skip corrupt row
    }
  }
  cache = { users, instances };

  // Backfill/migrate instances. The platform manages ONE shared server, so
  // every instance points at the same public HTTP/TCP tunnel endpoints. This
  // also migrates legacy instances that stored a portal-URL connection string
  // (e.g. https://gtsdb-cloud.abby.md/<slug>).
  for (const inst of Object.values(cache.instances)) {
    if (!inst.slug) inst.slug = `${slugify(inst.name)}-${inst.id.slice(-4)}`;
    inst.connectionString = getPublicHttpUrl();
    inst.tcpConnectionString = getPublicTcpUrl();
    if (!inst.namespace) inst.namespace = "";
    if (inst.usage?.keys === undefined) inst.usage.keys = 0;
    if (inst.usage?.points === undefined) inst.usage.points = 0;
    if (inst.usage?.reads === undefined) inst.usage.reads = 0;
    if (inst.usage?.writes === undefined) inst.usage.writes = 0;
  }
  return cache;
}

function saveStore(): void {
  if (!cache || !db) return;
  const upsertU = db.prepare(
    "INSERT INTO users(uid,data) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data"
  );
  const upsertI = db.prepare(
    "INSERT INTO instances(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data"
  );
  const tx = db.transaction(() => {
    db!.prepare("DELETE FROM users").run();
    db!.prepare("DELETE FROM instances").run();
    for (const u of Object.values(cache!.users)) upsertU.run(u.uid, JSON.stringify(u));
    for (const i of Object.values(cache!.instances)) upsertI.run(i.id, JSON.stringify(i));
  });
  tx();
}

async function load(): Promise<StoreShape> {
  return loadStore();
}

/** Serialise mutations so concurrent API calls never corrupt the store. */
function mutate<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Absolute path to the SQLite file (for backup). */
export function dbFile(): string {
  getDb();
  return DB_FILE;
}

/** Checkpoint the WAL so the .db file is self-contained (for backup). */
export function checkpointDb(): void {
  if (db) db.pragma("wal_checkpoint(TRUNCATE)");
}

/** Absolute path to the platform SQLite file. */
export function platformDbPath(): string {
  return DB_FILE;
}

/** Close the SQLite connection and drop in-memory caches (used by restore). */
export function closeStore(): void {
  if (db) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // ignore
    }
    try {
      db.close();
    } catch {
      // ignore
    }
  }
  db = null;
  cache = null;
  writeQueue = Promise.resolve();
}

/** Reopen the store from disk and rebuild caches (used by restore). */
export function reloadStore(): void {
  closeStore();
  getDb();
  loadStore();
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
    saveStore();
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
    saveStore();
    return user;
  });
}

/** Attach a Stripe customer id to a user (billing integration). */
export async function setUserStripeCustomer(
  uid: string,
  stripeCustomerId: string
): Promise<PlatformUser | null> {
  return mutate(async () => {
    const store = await load();
    const user = store.users[uid];
    if (!user) return null;
    user.stripeCustomerId = stripeCustomerId;
    saveStore();
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

export async function listAllInstances(): Promise<PlatformInstance[]> {
  const store = await load();
  return Object.values(store.instances);
}

export async function listAllUsers(): Promise<PlatformUser[]> {
  const store = await load();
  return Object.values(store.users).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function deleteUser(uid: string): Promise<void> {
  return mutate(async () => {
    const store = await load();
    delete store.users[uid];
    // Cascade: remove every instance owned by this user.
    for (const id of Object.keys(store.instances)) {
      if (store.instances[id].ownerUid === uid) delete store.instances[id];
    }
    saveStore();
  });
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
    saveStore();
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
    saveStore();
    return inst;
  });
}

export async function deleteInstance(id: string): Promise<void> {
  return mutate(async () => {
    const store = await load();
    delete store.instances[id];
    saveStore();
  });
}

export async function touchInstance(
  id: string,
  usage?: { reads?: number; writes?: number; points?: number; keys?: number },
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
    if (usage?.points) inst.usage.points += usage.points;
    if (usage?.keys) inst.usage.keys += usage.keys;
    if (status) inst.status = status;
    if (serverInfo !== undefined) inst.serverInfo = serverInfo;
    if (status === "active") inst.lastHealthyAt = new Date().toISOString();
    inst.updatedAt = new Date().toISOString();
    saveStore();
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
