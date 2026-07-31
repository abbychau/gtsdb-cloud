// Client-safe admin helpers.
//
// Uses the PUBLIC env var (NEXT_PUBLIC_ADMIN_EMAILS) so the UI can decide
// whether to show admin navigation / pages. The authoritative server-side
// authorization lives in lib/admin-server.ts and uses the server-only
// ADMIN_EMAILS env.

export function getAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return getAdminEmails().includes(e);
}
