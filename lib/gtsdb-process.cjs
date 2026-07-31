"use strict";

/**
 * Managed GTSDB process lifecycle (CommonJS).
 *
 * Kept as a plain .cjs file on disk (NOT bundled by Next) so that the custom
 * server (`server.js`) can `require()` it directly. The portal OWNS the
 * managed GTSDB server: it spawns `bin/gtsdb-dev.exe` on boot and tears it
 * down when the portal stops, so the two always go on/off together.
 *
 * Disable with GTSDB_MANAGED=false, or it won't double-start if a GTSDB server
 * is already listening on :5556.
 */
const { spawn } = require("child_process");
const { existsSync } = require("fs");
const { createConnection } = require("net");
const path = require("path");

let gtsdb = null;
let started = false;

/** True when something is already listening on the given TCP port. */
function portInUse(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const sock = createConnection({ host: "127.0.0.1", port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(timeoutMs, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function startGtsdb(opts = {}) {
  if (started) return;
  started = true;

  if (process.env.GTSDB_MANAGED === "false") {
    console.log("[gtsdb] management disabled via GTSDB_MANAGED=false");
    return;
  }

  // Resolve paths relative to the Next.js project root (not process.cwd(),
  // which depends on where the portal is launched from).
  const root = opts.root || process.cwd();
  const bin = path.join(root, "bin", "gtsdb-dev.exe");
  if (!existsSync(bin)) {
    console.warn(`[gtsdb] binary not found at ${bin} — run \`npm run gtsdb:build\` first.`);
    return;
  }

  // Never start a second server if one is already listening on :5556
  // (e.g. the developer runs GTSDB manually).
  if (await portInUse(5556)) {
    console.log("[gtsdb] a server is already running on :5556 — skipping managed start");
    return;
  }

  // GTSDB resolves ./data relative to its working directory, which is the
  // repo root (parent of this Next.js project).
  const gtsdbRoot = path.join(root, "..");
  const ini = process.env.GTSDB_INI || "gtsdb.local.ini";

  console.log(`[gtsdb] starting managed server (${bin} ${ini})`);
  gtsdb = spawn(bin, [ini], { cwd: gtsdbRoot, stdio: "inherit" });
  gtsdb.on("exit", (code, signal) => {
    console.log(`[gtsdb] exited (code=${code} signal=${signal})`);
    gtsdb = null;
  });
  gtsdb.on("error", (err) => {
    console.error(`[gtsdb] failed to start: ${err.message}`);
    gtsdb = null;
  });
}

function stopGtsdb() {
  if (gtsdb && gtsdb.exitCode === null && gtsdb.signalCode === null) {
    console.log("[gtsdb] shutting down managed server");
    gtsdb.kill("SIGTERM");
    // Force-kill if it hasn't exited shortly after (Windows SIGTERM is harsh).
    setTimeout(() => {
      if (gtsdb && gtsdb.exitCode === null) gtsdb.kill("SIGKILL");
    }, 1500).unref();
  }
}

module.exports = { startGtsdb, stopGtsdb };
