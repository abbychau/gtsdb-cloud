// Shared types for the GTSDB Cloud platform.

export type PlanId = "free" | "pro" | "team";

export type InstanceStatus =
  | "provisioning"
  | "active"
  | "offline"
  | "suspended";

export type InstanceRegion =
  | "auto"
  | "asia-east1"
  | "asia-northeast1"
  | "europe-west1"
  | "us-central1"
  | "us-east1"
  | "local";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: "firebase" | "demo";
}

/** A GTSDB data point, matching the wire format `{ key, timestamp, value }`. */
export interface DataPoint {
  key: string;
  timestamp: number;
  value: number;
}

/** A key with its stored point count, from `idswithcount`. */
export interface KeyCount {
  key: string;
  count: number;
}

/** The GTSDB serverinfo payload. */
export interface ServerInfo {
  version?: string;
  key_count?: number;
  health?: string;
  uptime_seconds?: number;
  goroutines?: number;
  memory_alloc_mb?: number;
  memory_total_mb?: number;
  num_cpu?: number;
  listen_tcp?: string;
  listen_http?: string;
  data_dir?: string;
  file_handle_lru?: number;
}

/** Generic GTSDB JSON response. */
export interface GtsdbResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  read_query_params?: {
    start_timestamp?: number;
    end_timestamp?: number;
    downsampling?: number;
    lastx?: number;
    aggregation?: string;
  };
  multi_data?: Record<string, DataPoint[]>;
}

/** The usage snapshot tracked per instance. */
export interface InstanceUsage {
  points: number;
  keys: number;
  reads: number;
  writes: number;
}

/** A user record in the platform store. */
export interface PlatformUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: "firebase" | "demo";
  plan: PlanId;
  /** Stripe customer id (set once billing is wired). */
  stripeCustomerId?: string;
  createdAt: string;
  lastSeenAt: string;
}

/** A provisioned instance (the platform's view of a GTSDB server connection). */
export interface PlatformInstance {
  id: string;
  ownerUid: string;
  name: string;
  /** URL-safe slug derived from the name (used in the auto-generated connection string). */
  slug: string;
  /** Public HTTPS connection string for the managed server. */
  connectionString: string;
  /** Public TCP connection string for the managed server. */
  tcpConnectionString: string;
  region: InstanceRegion;
  plan: PlanId;
  status: InstanceStatus;
  /** Internal address of the shared GTSDB server the platform forwards to. */
  endpoint: string;
  /** The tenant namespace (GTSDB username) on the shared server. */
  namespace: string;
  /** Connection credential for the tenant namespace, managed separately. */
  token: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  usage: InstanceUsage;
  /** Cached serverinfo from the last successful health check. */
  serverInfo?: ServerInfo | null;
  /** When the server was last reachable. */
  lastHealthyAt?: string | null;
}

export interface CreateInstanceInput {
  name: string;
  region?: InstanceRegion;
  plan?: PlanId;
}

export interface UpdateInstanceInput {
  name?: string;
  region?: InstanceRegion;
  plan?: PlanId;
  endpoint?: string;
  status?: InstanceStatus;
}

/** A plan definition used for freemium gating. */
export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  maxInstances: number;
  maxKeysPerInstance: number;
  maxPoints: number; // max stored data points (hard storage cap)
  retentionDays: number;
  features: string[];
  highlighted?: boolean;
  cta: string;
}
