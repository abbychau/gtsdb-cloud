"use strict";

/**
 * Startup migration: ensure every platform instance has a real GTSDB tenant
 * namespace on the shared physical server (one tenant per instance).
 *
 * Instances created before multi-tenant provisioning (or with an empty
 * namespace) are provisioned here via `adduser` (username = instance id),
 * falling back to `resetkey` if the user already exists. The instance is then
 * given the real tenant token + namespace and marked active. Idempotent:
 * instances that already have a namespace are skipped.
 *
 * Runs in server.js before the HTTP server starts listening, so the platform
 * store cache (loaded on first request) always sees the migrated file.
 */
const path = require("path");
const { promises: fs } = require("fs");

const STORE_FILE = path.join(__dirname, "..", "data", "platform.json");

function getBase() {
  return process.env.GTSDB_BASE_URL || "http://localhost:5556";
}
function getAdmin() {
  return process.env.GTSDB_ADMIN_TOKEN || "";
}

async function callGtsdb(base, token, body, timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${base}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

async function isUp(base, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function loadStore() {
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, "utf8"));
  } catch {
    return { users: {}, instances: {} };
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  const tmp = `${STORE_FILE}.migrate.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, STORE_FILE);
}

/** Extract the message from a GTSDB response. */
function message(data, fallback) {
  return (data && data.message) || fallback;
}

/** Provision all instances that are missing a tenant namespace. */
async function migrateMissingTenants() {
  const base = getBase();
  const admin = getAdmin();
  if (!admin) {
    console.log("[tenant-migrate] GTSDB_ADMIN_TOKEN not set — skipping");
    return { provisioned: 0, results: [] };
  }
  if (!(await isUp(base))) {
    console.log(`[tenant-migrate] GTSDB not reachable at ${base} — skipping`);
    return { provisioned: 0, results: [] };
  }

  const store = await loadStore();
  const results = [];
  let provisioned = 0;

  for (const inst of Object.values(store.instances || {})) {
    if (inst.namespace) continue; // already a tenant
    const username = inst.id;

    let token = null;
    if (inst.token) {
      // We already hold a credential. Verify it against the physical server
      // — if it's valid, just restore the namespace without rotating the
      // token (keeps existing clients connected). Only rotate if it's broken.
      const probe = await callGtsdb(base, inst.token, { operation: "idswithcount" });
      if (probe.ok && probe.data && probe.data.success) {
        inst.namespace = username;
        inst.updatedAt = new Date().toISOString();
        results.push({ id: username, ok: true, restored: true });
        continue;
      }
      // fall through to resetkey below
    }

    const created = await callGtsdb(base, admin, { operation: "adduser", key: username });
    const createdData = created.data && created.data.data;

    if (created.ok && created.data && created.data.success && createdData && createdData.token) {
      token = createdData.token;
    } else if (message(created.data, "").toLowerCase().includes("already exists")) {
      const reset = await callGtsdb(base, admin, { operation: "resetkey", key: username });
      const rd = reset.data && reset.data.data;
      if (reset.ok && reset.data && reset.data.success && rd && rd.token) {
        token = rd.token;
      } else {
        results.push({ id: username, ok: false, error: message(reset.data, "resetkey failed") });
        continue;
      }
    } else {
      results.push({ id: username, ok: false, error: message(created.data, "adduser failed") });
      continue;
    }

    inst.namespace = username;
    inst.token = token;
    inst.status = "active";
    inst.updatedAt = new Date().toISOString();
    provisioned++;
    results.push({ id: username, ok: true });
  }

  if (provisioned > 0) {
    await writeStore(store);
  }

  console.log(`[tenant-migrate] provisioned ${provisioned} tenant(s)`);
  for (const r of results) {
    if (!r.ok) console.error(`[tenant-migrate] ${r.id}: ${r.error}`);
  }
  return { provisioned, results };
}

module.exports = { migrateMissingTenants };
