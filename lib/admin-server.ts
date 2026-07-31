// Server-only admin authorization. The authoritative check uses the
// server-only ADMIN_EMAILS env (falling back to the public var) and can only
// be imported from route handlers.

import { HttpError } from "./route-utils";
import { extractBearerToken, verifyToken, type VerifiedUser } from "./server-auth";
import { upsertUser } from "./store";

export function getServerAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Verify the request user and require them to be an admin (401/403 otherwise). */
export async function requireAdmin(req: Request): Promise<VerifiedUser> {
  const token = extractBearerToken(req.headers);
  const user = await verifyToken(token);
  if (!user) throw new HttpError(401, "Authentication required");

  const email = (user.email || "").trim().toLowerCase();
  if (!getServerAdminEmails().includes(email)) {
    throw new HttpError(403, "Admin access required");
  }

  await upsertUser({
    uid: user.uid,
    email: user.email,
    name: user.name,
    photoURL: user.photoURL,
    provider: user.provider,
  });
  return user;
}
