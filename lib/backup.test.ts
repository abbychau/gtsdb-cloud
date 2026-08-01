import { describe, it, expect } from "vitest";
import { resolveBackupPath } from "./backup";

describe("resolveBackupPath", () => {
  it("resolves a plain zip name inside the backups dir", () => {
    const p = resolveBackupPath("gtsdb-cloud-2026-01-01.zip");
    expect(p).not.toBeNull();
    expect(p!.replace(/\\/g, "/").endsWith("gtsdb-cloud-2026-01-01.zip")).toBe(true);
  });

  it("rejects non-zip names", () => {
    expect(resolveBackupPath("x.txt")).toBeNull();
    expect(resolveBackupPath("x")).toBeNull();
    expect(resolveBackupPath("")).toBeNull();
  });

  it("prevents path traversal", () => {
    const p = resolveBackupPath("../../etc/passwd.zip");
    expect(p).not.toBeNull();
    // basename() is applied, so it can never escape the backups directory.
    expect(p!.replace(/\\/g, "/")).not.toContain("..");
  });
});
