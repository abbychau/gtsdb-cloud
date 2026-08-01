import { describe, it, expect } from "vitest";
import { extractBearerToken, verifyToken } from "./server-auth";

describe("extractBearerToken", () => {
  it("extracts a bearer token", () => {
    const headers = new Headers({ Authorization: "Bearer abc123" });
    expect(extractBearerToken(headers)).toBe("abc123");
  });

  it("returns null when there is no auth header", () => {
    expect(extractBearerToken(new Headers())).toBeNull();
  });

  it("rejects non-bearer schemes", () => {
    const headers = new Headers({ Authorization: "Basic abc123" });
    expect(extractBearerToken(headers)).toBeNull();
  });
});

describe("verifyToken (demo path)", () => {
  it("accepts demo tokens", async () => {
    const user = await verifyToken("demo.admin");
    expect(user?.uid).toBe("admin");
    expect(user?.email).toBe("admin@demo.gtsdb.cloud");
    expect(user?.provider).toBe("demo");
  });

  it("rejects empty, null and malformed tokens", async () => {
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken(null)).toBeNull();
    expect(await verifyToken(undefined)).toBeNull();
    expect(await verifyToken("demo.")).toBeNull();
    expect(await verifyToken("notademotoken")).toBeNull();
  });
});
