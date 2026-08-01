import type {
  DataPoint,
  GtsdbResponse,
  KeyCount,
  ServerInfo,
} from "./types";

// ---------------------------------------------------------------------------
// GTSDB wire protocol client. The same shapes are used for the platform API
// proxy (`/api/instances/[id]/proxy`) and for documentation/code snippets.
// ---------------------------------------------------------------------------

export interface ReadQuery {
  start_timestamp?: number;
  end_timestamp?: number;
  downsampling?: number;
  lastx?: number;
  aggregation?: string;
}

export interface GtsdbRequest {
  operation: string;
  key?: string;
  tokey?: string;
  keys?: string[];
  write?: { value: number; timestamp?: number };
  read?: ReadQuery;
  points?: { key: string; value: number; timestamp?: number }[];
  data?: string;
  payload?: {
    operator?: string;
    value?: number;
    timestampFrom?: number;
    timestampTo?: number;
  };
  since?: number;
}

export type Aggregation =
  | "avg"
  | "sum"
  | "min"
  | "max"
  | "first"
  | "last"
  | "count"
  | "median"
  | "p50"
  | "p95"
  | "p99";

export const AGGREGATIONS: Aggregation[] = [
  "avg",
  "sum",
  "min",
  "max",
  "first",
  "last",
  "count",
  "median",
  "p50",
  "p95",
  "p99",
];

/** Normalise a GTSDB response into a typed wrapper. */
export function normalizeResponse(raw: unknown): GtsdbResponse {
  if (raw && typeof raw === "object" && "success" in raw) {
    return raw as GtsdbResponse;
  }
  return { success: false, message: "Unexpected response from server" };
}

export function readPoints(res: GtsdbResponse): DataPoint[] {
  if (res.multi_data) {
    const out: DataPoint[] = [];
    for (const [key, pts] of Object.entries(res.multi_data)) {
      for (const p of pts) out.push({ ...p, key: p.key || key });
    }
    return out;
  }
  return Array.isArray(res.data) ? (res.data as DataPoint[]) : [];
}

export function readKeys(res: GtsdbResponse): string[] {
  return Array.isArray(res.data) ? (res.data as string[]) : [];
}

export function readKeyCounts(res: GtsdbResponse): KeyCount[] {
  if (Array.isArray(res.data)) return res.data as KeyCount[];
  return [];
}

export function readServerInfo(res: GtsdbResponse): ServerInfo | null {
  if (res.success && res.data && typeof res.data === "object") {
    return res.data as ServerInfo;
  }
  return null;
}

/** Helpers to build request bodies. */
export const ops = {
  write(key: string, value: number, timestamp?: number): GtsdbRequest {
    return { operation: "write", key, write: { value, timestamp } };
  },
  batchWrite(
    points: { key: string; value: number; timestamp?: number }[]
  ): GtsdbRequest {
    return { operation: "batch-write", points };
  },
  readLast(key: string, lastx: number, aggregation = "avg"): GtsdbRequest {
    return {
      operation: "read",
      key,
      read: { lastx, aggregation },
    };
  },
  readRange(
    key: string,
    start: number,
    end: number,
    downsampling?: number,
    aggregation = "avg"
  ): GtsdbRequest {
    return {
      operation: "read",
      key,
      read: { start_timestamp: start, end_timestamp: end, downsampling, aggregation },
    };
  },
  multiRead(keys: string[], q: ReadQuery): GtsdbRequest {
    return { operation: "multi-read", keys, read: q };
  },
  ids(): GtsdbRequest {
    return { operation: "ids" };
  },
  idsWithCount(): GtsdbRequest {
    return { operation: "idswithcount" };
  },
  /** Stored-points count for the instance's OWN namespace only (billing). */
  ownIdsWithCount(): GtsdbRequest {
    return { operation: "idswithcount-own" };
  },
  serverInfo(): GtsdbRequest {
    return { operation: "serverinfo" };
  },
  initKey(key: string): GtsdbRequest {
    return { operation: "initkey", key };
  },
  renameKey(key: string, tokey: string): GtsdbRequest {
    return { operation: "renamekey", key, tokey };
  },
  deleteKey(key: string): GtsdbRequest {
    return { operation: "deletekey", key };
  },
  reloadKey(key: string): GtsdbRequest {
    return { operation: "reloadkey", key };
  },
  compactKey(key: string): GtsdbRequest {
    return { operation: "compact", key };
  },
  deleteDataPoint(
    key: string,
    opts: { operator?: string; value?: number; timestampFrom?: number; timestampTo?: number }
  ): GtsdbRequest {
    return { operation: "deleteDataPoint", key, payload: opts };
  },
  dataPatch(key: string, data: string): GtsdbRequest {
    return { operation: "data-patch", key, data };
  },
  flush(): GtsdbRequest {
    return { operation: "flush" };
  },
};
