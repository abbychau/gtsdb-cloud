// Server-only configuration for the shared, multi-tenant GTSDB instance that
// the platform manages on behalf of all users. This module must only be
// imported from server code (route handlers / the store).

/** Root token used by the platform to provision/rotate tenant namespaces. */
export function getAdminToken(): string {
  return process.env.GTSDB_ADMIN_TOKEN || "";
}

/** Internal base URL the platform uses to talk to the shared GTSDB server. */
export function getGtsdbBase(): string {
  return process.env.GTSDB_BASE_URL || "http://localhost:5556";
}

/** Public HTTPS endpoint clients use to reach the managed server. */
export function getPublicHttpUrl(): string {
  return process.env.GTSDB_PUBLIC_HTTP_URL || "https://gtsdb-http-5556.abby.md";
}

/** Public TCP endpoint clients use for high-throughput writes. */
export function getPublicTcpUrl(): string {
  return process.env.GTSDB_PUBLIC_TCP_URL || "tcp://gtsdb-tcp-5555.abby.md:5555";
}

/**
 * Canonical public base URL of the portal. Used for Stripe success/cancel/
 * return URLs. Must be a real, browser-reachable origin — never derive it from
 * the request Host header behind a Cloudflare tunnel (it resolves to
 * 0.0.0.0:13000 which the browser cannot reach).
 */
export function getPortalPublicUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://gtsdb-cloud.abby.md";
}
