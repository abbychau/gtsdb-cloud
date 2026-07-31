import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
