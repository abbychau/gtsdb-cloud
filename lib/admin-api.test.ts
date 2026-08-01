import { afterEach, describe, it, expect, vi } from "vitest";
import {
  AdminApiError,
  createBackup,
  deleteBackup,
  listBackups,
  restoreBackup,
} from "./admin-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }))
  );
}

describe("admin-api", () => {
  it("createBackup POSTs with the bearer token", async () => {
    const fetchMock = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      status: 201,
      json: async () => ({
        name: "gtsdb-cloud-x.zip",
        size: 123,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const info = await createBackup("tok123");
    expect(info.name).toBe("gtsdb-cloud-x.zip");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/backup");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123");
  });

  it("deleteBackup DELETE /api/admin/backups/<name>", async () => {
    const fetchMock = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteBackup("gtsdb-cloud-x.zip", "tok");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/backups/gtsdb-cloud-x.zip");
    expect(init.method).toBe("DELETE");
  });

  it("restoreBackup POST /api/admin/backups/<name>/restore", async () => {
    const fetchMock = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({
        name: "gtsdb-cloud-x.zip",
        restoredAt: "2026-01-01T00:00:00.000Z",
        gtsdbRestarted: true,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await restoreBackup("gtsdb-cloud-x.zip", "tok");
    expect(result.gtsdbRestarted).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/backups/gtsdb-cloud-x.zip/restore");
    expect(init.method).toBe("POST");
  });

  it("surfaces the server error message as AdminApiError", async () => {
    stubFetch(403, { error: "Admin access required" });
    await expect(listBackups("tok")).rejects.toBeInstanceOf(AdminApiError);
    await expect(listBackups("tok")).rejects.toThrow("Admin access required");
  });
});
