import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PlatformInstance } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number compactly: 1200000 -> "1.2M" */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Format a plain number with thousands separators */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Format a byte count human-readably: 1536 -> "1.5 KB" */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format a float value nicely (up to 4 decimals) */
export function formatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** Generate a short human-friendly id (used for instances / tokens) */
export function nanoid(prefix = "", len = 10): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${out}` : out;
}

/** Format an ISO date string into a friendly label */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Mask a secret token, showing only the last 4 chars */
export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "•".repeat(token.length);
  return `••••••••${token.slice(-4)}`;
}

/** Truncate long strings with an ellipsis */
export function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

/** Turn a name into a URL-safe slug: "Prod Sensors" -> "prod-sensors" */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "instance";
}

/** Generate a random connection credential, e.g. gtsb_AbC123... */
export function generateConnectionToken(): string {
  const rand = () => Math.random().toString(36).slice(2);
  return `gtsb_${rand()}${rand()}`;
}

/** Make a slug unique against a set of existing slugs (e.g. "cpu", "cpu-2"). */
export function uniqueSlug(base: string, existingSlugs: string[]): string {
  const used = new Set(existingSlugs);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Base URL of the gtsdb-admin app (a separate deployment). */
export function getAdminBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

/** Deep-link to gtsdb-admin, pre-connected to this instance. */
export function adminDeepLink(
  instance: Pick<
    PlatformInstance,
    "external" | "connectionString" | "endpoint" | "token"
  >
): string {
  // Managed instances: connect via the public HTTP endpoint + tenant token.
  // Self-hosted instances: connect directly to the user's own server.
  const params = new URLSearchParams({
    apiurl: instance.external ? instance.endpoint : instance.connectionString,
  });
  if (instance.token) params.set("token", instance.token);
  return `${getAdminBaseUrl()}/?${params.toString()}`;
}
