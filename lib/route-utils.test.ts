import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { handle, HttpError, jsonError } from "./route-utils";

describe("HttpError", () => {
  it("carries a status and message", () => {
    const err = new HttpError(404, "Missing");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Missing");
  });
});

describe("jsonError", () => {
  it("maps HttpError to its status + error message", async () => {
    const res = jsonError(new HttpError(403, "Admin required"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Admin required" });
  });

  it("maps unknown errors to 500", async () => {
    const res = jsonError(new Error("boom"));
    expect(res.status).toBe(500);
  });
});

describe("handle", () => {
  it("passes through successful responses", async () => {
    const wrapped = handle(async () => NextResponse.json({ ok: true }));
    const res = await wrapped();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("converts thrown HttpErrors", async () => {
    const wrapped = handle(async () => {
      throw new HttpError(400, "Invalid backup name");
    });
    const res = await wrapped();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid backup name" });
  });
});
