import { describe, it, expect } from "vitest";
import { PLANS, PLAN_ORDER, getPlan, planLimitLabel } from "./plans";

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
});
