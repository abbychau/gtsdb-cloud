// Backup utilities (server-only). A backup bundles the platform SQLite DB and
// the physical GTSDB data directory (WAL files + users.json) into a timestamped
// zip under ./data/backups.

import AdmZip from "adm-zip";
import { promises as fs } from "fs";
import path from "path";
import { checkpointDb, dbFile } from "./store";

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
