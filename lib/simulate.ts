// Deterministic in-memory simulation of a GTSDB server.
//
// The platform proxy uses this as a fallback when an instance has
// `simulate: true` and the configured GTSDB endpoint is unreachable, so the
// whole control plane + data explorer is explorable out of the box. The
// simulator produces the exact same JSON shapes as a real GTSDB server
// (`read`, `ids`, `idswithcount`, `serverinfo`, ...).

import type { DataPoint, GtsdbResponse, ServerInfo } from "./types";

export const SIMULATED_DEFAULT_KEYS = [
  "cpu",
  "memory",
  "temperature",
  "humidity",
  "power",
];

interface SimState {
  points: Record<string, DataPoint[]>;
}

const states = new Map<string, SimState>();

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function baselineFor(key: string): { base: number; amp: number; period: number } {
  const h = hashStr(key);
  const table: Array<{ base: number; amp: number }> = [
    { base: 42, amp: 18 }, // cpu %
    { base: 55, amp: 25 }, // memory %
    { base: 24, amp: 6 },  // temperature °C
    { base: 62, amp: 18 }, // humidity %
    { base: 320, amp: 120 }, // power W
  ];
  const row = table[h % table.length];
  return { base: row.base, amp: row.amp, period: 300 + (h % 240) };
}

function getState(instanceId: string): SimState {
  let st = states.get(instanceId);
  if (!st) {
    st = { points: {} };
    const now = Math.floor(Date.now() / 1000);
    const step = 60;
    const span = 48 * 60 * 60; // 48h
    const start = now - span;
    const count = Math.floor(span / step);
    for (const key of SIMULATED_DEFAULT_KEYS) {
      const { base, amp, period } = baselineFor(key);
      const rng = mulberry32(hashStr(`${instanceId}:${key}`));
      const points: DataPoint[] = [];
      let last = base;
      for (let i = 0; i < count; i++) {
        const t = start + i * step;
        const wave = Math.sin((t / period) * Math.PI * 2);
        const drift = Math.sin((t / (period * 7)) * Math.PI * 2) * amp * 0.4;
        const noise = (rng() - 0.5) * amp * 0.12;
        let value = base + wave * amp * 0.5 + drift + noise;
        value = Math.max(0, Math.round(value * 100) / 100);
        last = value;
        points.push({ key, timestamp: t, value });
      }
      st.points[key] = points;
    }
    states.set(instanceId, st);
  }
  return st;
}

function aggregate(
  values: number[],
  agg: string
): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "first":
      return values[0];
    case "last":
      return values[values.length - 1];
    case "count":
      return values.length;
    case "median":
    case "p50":
    case "p95":
    case "p99": {
      const sorted = [...values].sort((a, b) => a - b);
      const q = agg === "p50" || agg === "median" ? 0.5 : agg === "p95" ? 0.95 : 0.99;
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
      return sorted[idx];
    }
    case "avg":
    default:
      return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

function downsample(
  points: DataPoint[],
  step: number,
  agg: string
): DataPoint[] {
  if (!step || step <= 0) return points;
  const buckets = new Map<number, DataPoint[]>();
  for (const p of points) {
    const b = Math.floor(p.timestamp / step) * step;
    const arr = buckets.get(b);
    if (arr) arr.push(p);
    else buckets.set(b, [p]);
  }
  const out: DataPoint[] = [];
  for (const [b, arr] of buckets) {
    const values = arr.map((p) => p.value);
    const v = Number(aggregate(values, agg).toFixed(4));
    out.push({ key: arr[0].key, timestamp: b, value: v });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

function validKey(key: string): boolean {
  return Boolean(key) && !key.includes("..");
}

export function simulateOperation(
  instanceId: string,
  op: {
    operation?: string;
    key?: string;
    tokey?: string;
    keys?: string[];
    write?: { value?: number; timestamp?: number };
    read?: {
      start_timestamp?: number;
      end_timestamp?: number;
      downsampling?: number;
      lastx?: number;
      aggregation?: string;
    };
    points?: Array<{ key: string; value?: number; timestamp?: number }>;
    data?: string;
    payload?: { operator?: string; value?: number; timestampFrom?: number; timestampTo?: number };
  }
): GtsdbResponse {
  const name = (op.operation || "").toLowerCase();
  const state = getState(instanceId);

  switch (name) {
    case "serverinfo": {
      const info: ServerInfo = {
        version: "1.0 (simulated)",
        key_count: Object.keys(state.points).length,
        health: "ok",
        uptime_seconds: 123456,
        goroutines: 24,
        memory_alloc_mb: 8.4,
        memory_total_mb: 61.2,
        num_cpu: 8,
        listen_tcp: ":5555",
        listen_http: ":5556",
        data_dir: "./data/simulated",
        file_handle_lru: 700,
      };
      return { success: true, data: info };
    }
    case "ids": {
      return { success: true, data: Object.keys(state.points).sort() };
    }
    case "idswithcount": {
      const data = Object.entries(state.points).map(([key, pts]) => ({
        key,
        count: pts.length,
      }));
      return { success: true, data };
    }
    case "write": {
      const key = op.key || "";
      if (!validKey(key)) return { success: false, message: "Invalid key" };
      if (op.write?.value === undefined)
        return { success: false, message: "Write data required" };
      const ts =
        op.write.timestamp || Math.floor(Date.now() / 1000);
      const arr = state.points[key] ?? (state.points[key] = []);
      arr.push({ key, timestamp: ts, value: op.write.value });
      arr.sort((a, b) => a.timestamp - b.timestamp);
      return { success: true, message: "Data point stored" };
    }
    case "batch-write": {
      const pts = op.points ?? [];
      let count = 0;
      for (const p of pts) {
        if (!validKey(p.key) || p.value === undefined) continue;
        const ts = p.timestamp || Math.floor(Date.now() / 1000);
        const arr = state.points[p.key] ?? (state.points[p.key] = []);
        arr.push({ key: p.key, timestamp: ts, value: p.value });
        arr.sort((a, b) => a.timestamp - b.timestamp);
        count++;
      }
      return { success: true, message: `Stored ${count} data points` };
    }
    case "read": {
      const key = op.key || "";
      const read = op.read ?? {};
      const agg = read.aggregation || "avg";
      const all = (state.points[key] ?? []).slice();
      let out: DataPoint[];
      if (read.lastx && read.lastx > 0) {
        out = all.slice(-read.lastx);
      } else if (read.start_timestamp && read.end_timestamp) {
        const start = read.start_timestamp;
        const end = read.end_timestamp;
        out = all.filter(
          (p) => p.timestamp >= start && p.timestamp <= end
        );
      } else {
        out = all.slice(-1);
      }
      const processed = downsample(out, read.downsampling || 0, agg);
      return {
        success: true,
        data: processed,
        read_query_params: read as GtsdbResponse["read_query_params"],
      };
    }
    case "multi-read": {
      const keys = op.keys ?? [];
      const read = op.read ?? {};
      const agg = read.aggregation || "avg";
      const multi_data: Record<string, DataPoint[]> = {};
      for (const key of keys) {
        const all = (state.points[key] ?? []).slice();
        let out: DataPoint[];
        if (read.lastx && read.lastx > 0) out = all.slice(-read.lastx);
        else if (read.start_timestamp && read.end_timestamp)
          out = all.filter(
            (p) =>
              p.timestamp >= (read.start_timestamp ?? 0) &&
              p.timestamp <= (read.end_timestamp ?? 0)
          );
        else out = all.slice(-1);
        multi_data[key] = downsample(out, read.downsampling || 0, agg);
      }
      return { success: true, multi_data, read_query_params: read };
    }
    case "initkey": {
      const key = op.key || "";
      if (!validKey(key)) return { success: false, message: "Invalid key" };
      if (!state.points[key]) state.points[key] = [];
      return { success: true, message: `Key initialized: ${key}` };
    }
    case "renamekey": {
      const from = op.key || "";
      const to = op.tokey || "";
      if (!validKey(from) || !validKey(to))
        return { success: false, message: "Invalid key" };
      const arr = state.points[from];
      if (!arr) return { success: false, message: "Key not found" };
      state.points[to] = arr.map((p) => ({ ...p, key: to }));
      delete state.points[from];
      return { success: true, message: `Key renamed: ${from} -> ${to}` };
    }
    case "deletekey": {
      const key = op.key || "";
      if (state.points[key]) delete state.points[key];
      return { success: true, message: `Key deleted: ${key}` };
    }
    case "reloadkey": {
      const key = op.key || "";
      if (!state.points[key]) {
        state.points[key] = [];
        return { success: true, message: `Key reloaded (not found on disk): ${key}` };
      }
      return { success: true, message: `Key reloaded: ${key}` };
    }
    case "compact": {
      return { success: true, message: `Key compacted: ${op.key}` };
    }
    case "flush": {
      return { success: true, message: "Data flushed" };
    }
    case "deleteDataPoint": {
      const key = op.key || "";
      const pl = op.payload ?? {};
      const arr = state.points[key];
      if (!arr) return { success: true, message: "0 data points deleted" };
      const before = arr.length;
      state.points[key] = arr.filter((p) => {
        let keep = true;
        if (pl.value !== undefined) {
          const opOk =
            pl.operator === ">" ? p.value > (pl.value ?? 0)
            : pl.operator === ">=" ? p.value >= (pl.value ?? 0)
            : pl.operator === "<" ? p.value < (pl.value ?? 0)
            : pl.operator === "<=" ? p.value <= (pl.value ?? 0)
            : pl.operator === "!=" ? p.value !== (pl.value ?? 0)
            : p.value === (pl.value ?? 0);
          if (opOk) keep = false;
        }
        if (pl.timestampFrom && p.timestamp < pl.timestampFrom) keep = false;
        if (pl.timestampTo && p.timestamp > pl.timestampTo) keep = false;
        return keep;
      });
      return {
        success: true,
        message: `${before - state.points[key].length} data points deleted`,
      };
    }
    case "data-patch": {
      // CSV: "timestamp,value" lines; JSON: array of [ts, value] or objects
      const key = op.key || "";
      if (!state.points[key]) state.points[key] = [];
      const text = op.data || "";
      const lines = text.trim().split(/\r?\n/);
      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(",");
        if (parts.length < 2) continue;
        const ts = Number(parts[0]);
        const val = Number(parts[1]);
        if (!Number.isFinite(ts) || !Number.isFinite(val)) continue;
        const arr = state.points[key]!;
        const idx = arr.findIndex((p) => p.timestamp === ts);
        if (idx >= 0) arr[idx] = { key, timestamp: ts, value: val };
        else arr.push({ key, timestamp: ts, value: val });
        count++;
      }
      state.points[key]!.sort((a, b) => a.timestamp - b.timestamp);
      return { success: true, message: `Patched ${count} data points` };
    }
    default:
      return { success: false, message: `Unknown operation: ${op.operation}` };
  }
}
