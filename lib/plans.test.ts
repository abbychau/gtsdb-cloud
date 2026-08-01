import { describe, it, expect } from "vitest";
import {
  PLANS,
  PLAN_ORDER,
  canCreateExternalInstance,
  getPlan,
  planLimitLabel,
} from "./plans";

describe("plans", () => {
  it("defines a stable plan order", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "team"]);
  });

  it("exposes pricing and caps per tier", () => {
    expect(getPlan("free").priceMonthly).toBe(0);
    expect(getPlan("pro").priceMonthly).toBe(29);
    expect(getPlan("team").maxPoints).toBe(5_000_000_000);
    expect(getPlan("pro").maxKeysPerInstance).toBe(500);
  });

  it("falls back to free for unknown ids", () => {
    expect(getPlan("enterprise" as never).name).toBe("Free");
  });

  it("labels instance limits with pluralisation", () => {
    expect(planLimitLabel(PLANS.free)).toContain("1 instance");
    expect(planLimitLabel(PLANS.team)).toContain("20 instances");
  });

  it("caps self-hosted connections per plan (free 1 / pro 10 / team 200)", () => {
    expect(getPlan("free").maxExternalInstances).toBe(1);
    expect(getPlan("pro").maxExternalInstances).toBe(10);
    expect(getPlan("team").maxExternalInstances).toBe(200);
    expect(canCreateExternalInstance("free", 0)).toBe(true);
    expect(canCreateExternalInstance("free", 1)).toBe(false);
    expect(canCreateExternalInstance("pro", 9)).toBe(true);
    expect(canCreateExternalInstance("pro", 10)).toBe(false);
    expect(canCreateExternalInstance("team", 200)).toBe(false);
  });
});
