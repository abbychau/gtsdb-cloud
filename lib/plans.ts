import type { Plan, PlanId } from "./types";

// Freemium plan definitions. These mirror the tiering used by modern DBaaS
// platforms: a free tier to get started, then Pro and Team tiers.

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "For side projects and learning.",
    priceMonthly: 0,
    priceYearly: 0,
    maxInstances: 1,
    maxExternalInstances: 1,
    maxKeysPerInstance: 10,
    maxPoints: 5_000_000,
    retentionDays: 7,
    features: [
      "1 managed instance",
      "Up to 10 series per instance",
      "5M data points storage",
      "7-day retention",
      "REST + TCP API access",
      "Community support",
    ],
    cta: "Start for free",
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For production workloads.",
    priceMonthly: 29,
    priceYearly: 290,
    maxInstances: 5,
    maxExternalInstances: 10,
    maxKeysPerInstance: 500,
    maxPoints: 500_000_000,
    retentionDays: 90,
    features: [
      "5 managed instances",
      "Up to 500 series per instance",
      "500M data points storage",
      "90-day retention",
      "Downsampling & aggregation",
      "Usage analytics dashboard",
      "Email support (24h)",
    ],
    highlighted: true,
    cta: "Upgrade to Pro",
  },
  team: {
    id: "team",
    name: "Team",
    tagline: "For teams & high-throughput IoT.",
    priceMonthly: 99,
    priceYearly: 990,
    maxInstances: 20,
    maxExternalInstances: 200,
    maxKeysPerInstance: 5000,
    maxPoints: 5_000_000_000,
    retentionDays: 365,
    features: [
      "20 managed instances",
      "Up to 5,000 series per instance",
      "5B data points storage",
      "12-month retention",
      "SSO & team roles",
      "Priority support (4h)",
      "Custom regions",
    ],
    cta: "Contact sales",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "team"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id] ?? PLANS.free;
}

/** Human-friendly limits text for the instance header / cards. */
export function planLimitLabel(plan: Plan): string {
  return `${plan.maxInstances} instance${plan.maxInstances > 1 ? "s" : ""} · ${formatPoints(
    plan.maxPoints
  )} pts storage`;
}

export function formatPoints(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Return true when the user's plan allows creating another instance. */
export function canCreateInstance(plan: PlanId, currentCount: number): boolean {
  const p = getPlan(plan);
  return currentCount < p.maxInstances;
}

/** Return true when the plan allows another self-hosted (external) connection. */
export function canCreateExternalInstance(plan: PlanId, currentCount: number): boolean {
  const p = getPlan(plan);
  return currentCount < p.maxExternalInstances;
}
