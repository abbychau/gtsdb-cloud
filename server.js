/**
 * GTSDB Cloud — custom Next.js server.
 *
 * The portal OWNS the managed GTSDB server. This process starts Next.js and
 * spawns `bin/gtsdb-dev.exe` on boot, then tears GTSDB down when the portal
 * stops, so the two always go on/off together.
 *
 * Usage:
 *   node server.js --dev      # development (HMR, source maps)
 *   node server.js            # production (requires `npm run build` first)
 *
 * Ports: PORT env, else 13000 in production and 12999 in development.
 * GTSDB management can be disabled with GTSDB_MANAGED=false, and it won't
 * double-start if GTSDB is already listening on :5556.
 */
const { createServer } = require("http");
const path = require("path");
const next = require("next");
const { startGtsdb, stopGtsdb } = require(path.join(__dirname, "lib", "gtsdb-process.cjs"));
const { migrateMissingTenants } = require(path.join(__dirname, "lib", "tenant-migrate.cjs"));

const dev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || (dev ? 12999 : 13000);

// Keep dev and prod builds in SEPARATE directories (dev -> .next-dev, prod ->
// .next) so a running dev server can never clobber the production build the
// way a shared .next directory could (prod on :13000 + dev on :12999 both
// live in this repo and previously fought over .next, causing 500s).
process.env.NEXT_DIST_DIR = dev ? ".next-dev" : ".next";

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  await startGtsdb({ root: __dirname });

  // Ensure every platform instance has a real tenant on the shared server
  // (one tenant per instance), so the physical server stays in sync.
  await migrateMissingTenants();

  const server = createServer((req, res) => handle(req, res));
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
  });

  const shutdown = () => {
    stopGtsdb();
    server.close(() => process.exit(0));
    // Force-exit if the server doesn't close promptly.
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", stopGtsdb);
}

main().catch((err) => {
  console.error(err);
  stopGtsdb();
  process.exit(1);
});
