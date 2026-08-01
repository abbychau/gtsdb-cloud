// Backup utilities (server-only). A backup bundles the platform SQLite DB and
// the physical GTSDB data directory (WAL files + users.json) into a timestamped
// zip under ./data/backups.

import { execFile } from "child_process";
import { promisify } from "util";
import AdmZip from "adm-zip";
import { promises as fs } from "fs";
import path from "path";
import { HttpError } from "./route-utils";
import {
  checkpointDb,
  closeStore,
  dbFile,
  platformDbPath,
  reloadStore,
} from "./store";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// The managed GTSDB runs from the repo root (parent of this Next.js app); its
// data dir is <repo root>/data.
const GTSDB_ROOT = path.resolve(process.cwd(), "..");
const GTSDB_DATA_DIR = path.join(GTSDB_ROOT, "data");

export interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}

export function backupDir(): string {
  return BACKUP_DIR;
}

export async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function addDirToZip(
  zip: AdmZip,
  dir: string,
  skipDirs: Set<string>
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      await addDirToZip(zip, full, skipDirs);
    } else {
      const rel = path.relative(GTSDB_DATA_DIR, full).split(path.sep).join("/");
      const lastSlash = rel.lastIndexOf("/");
      const zipFolder = lastSlash >= 0 ? `gtsdb-data/${rel.slice(0, lastSlash)}` : "gtsdb-data";
      const zipName = rel.slice(lastSlash + 1);
      zip.addLocalFile(full, zipFolder, zipName);
    }
  }
}

/** Create a full backup zip and return its metadata. */
export async function createBackup(): Promise<BackupInfo> {
  await ensureBackupDir();
  // Flush the SQLite WAL so platform.db is self-contained in the archive.
  checkpointDb();

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const name = `gtsdb-cloud-${ts}.zip`;
  const outPath = path.join(BACKUP_DIR, name);

  const zip = new AdmZip();
  const db = dbFile();
  zip.addLocalFile(db, "platform", path.basename(db));
  await addDirToZip(zip, GTSDB_DATA_DIR, new Set(["backups"]));
  zip.writeZip(outPath);

  const st = await fs.stat(outPath);
  return { name, size: st.size, createdAt: new Date().toISOString() };
}

/** List existing backups, newest first. */
export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDir();
  const entries = await fs.readdir(BACKUP_DIR).catch(() => []);
  const infos: BackupInfo[] = [];
  for (const name of entries) {
    if (!name.endsWith(".zip")) continue;
    try {
      const st = await fs.stat(path.join(BACKUP_DIR, name));
      infos.push({ name, size: st.size, createdAt: st.mtime.toISOString() });
    } catch {
      // skip
    }
  }
  return infos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Resolve a backup name to a safe absolute path (prevents path traversal). */
export function resolveBackupPath(name: string): string | null {
  const base = path.basename(name);
  if (!base.endsWith(".zip")) return null;
  return path.join(BACKUP_DIR, base);
}

const execFileAsync = promisify(execFile);

/** Run a winpm2 CLI command and return its stdout. */
function runWinpm2(args: string[]): Promise<string> {
  return execFileAsync("winpm2", args, { windowsHide: true }).then(
    (r) => (r.stdout || "").trim()
  );
}

/** Permanently delete a backup archive. */
export async function deleteBackup(name: string): Promise<void> {
  const filePath = resolveBackupPath(name);
  if (!filePath) throw new HttpError(400, "Invalid backup name");
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT")
      throw new HttpError(404, "Backup not found");
    throw err;
  }
}

/** Copy every file under `src` into `dest`, creating parent folders. */
async function overlayDir(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await fs.mkdir(d, { recursive: true });
      await overlayDir(s, d);
    } else {
      await fs.mkdir(path.dirname(d), { recursive: true });
      await fs.copyFile(s, d);
    }
  }
}

export interface RestoreResult {
  name: string;
  restoredAt: string;
  gtsdbRestarted: boolean;
}

let restoreInProgress = false;

async function doRestore(name: string, filePath: string): Promise<RestoreResult> {
  // Extract to a staging dir first — a corrupt zip must never touch live data.
  const staging = path.join(BACKUP_DIR, `.restore-${Date.now()}`);
  await fs.mkdir(staging, { recursive: true });
  let gtsdbStopped = false;
  try {
    const zip = new AdmZip(filePath);
    zip.extractAllTo(staging, true);

    // Stop the managed GTSDB so its WAL files are not locked on Windows.
    try {
      await runWinpm2(["stop", "gtsdb"]);
      gtsdbStopped = true;
    } catch (err) {
      throw new HttpError(
        500,
        `Could not stop the managed GTSDB (${(err as Error).message}). ` +
          "Restore aborted — nothing was changed. Make sure the winpm2 daemon is " +
          "running and the `gtsdb` app is managed."
      );
    }

    try {
      // Replace the platform SQLite DB (close -> swap -> reopen).
      const dbDest = platformDbPath();
      const dbSource = path.join(staging, "platform", path.basename(dbDest));
      if (!(await fs.stat(dbSource).catch(() => null)))
        throw new Error(`Backup is missing platform/${path.basename(dbDest)}`);
      closeStore();
      await fs.rm(`${dbDest}-wal`, { force: true }).catch(() => undefined);
      await fs.rm(`${dbDest}-shm`, { force: true }).catch(() => undefined);
      await fs.mkdir(path.dirname(dbDest), { recursive: true });
      await fs.copyFile(dbSource, dbDest);
      reloadStore(); // throws if the restored DB is unreadable

      // Overlay the physical GTSDB data directory (repo root /data).
      await overlayDir(path.join(staging, "gtsdb-data"), GTSDB_DATA_DIR);

      // Bring the managed GTSDB back up with the restored data.
      try {
        await runWinpm2(["restart", "gtsdb"]);
      } catch (err) {
        throw new HttpError(
          500,
          `Data restored, but failed to restart GTSDB (${(err as Error).message}). ` +
            "Run `winpm2 restart gtsdb` manually."
        );
      }

      return { name, restoredAt: new Date().toISOString(), gtsdbRestarted: true };
    } catch (err) {
      // Best-effort: bring GTSDB back up if we stopped it and something failed.
      if (gtsdbStopped) {
        try {
          await runWinpm2(["restart", "gtsdb"]);
        } catch {
          // ignore
        }
      }
      try {
        reloadStore();
      } catch {
        // leave for a restart
      }
      throw err;
    }
  } finally {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Restore a backup: stop GTSDB, replace platform DB + GTSDB data, restart GTSDB. */
export async function restoreBackup(name: string): Promise<RestoreResult> {
  const filePath = resolveBackupPath(name);
  if (!filePath) throw new HttpError(400, "Invalid backup name");
  if ((await fs.stat(filePath).catch(() => null)) === null)
    throw new HttpError(404, "Backup not found");
  if (restoreInProgress)
    throw new HttpError(409, "A restore is already in progress");
  restoreInProgress = true;
  try {
    return await doRestore(name, filePath);
  } finally {
    restoreInProgress = false;
  }
}
