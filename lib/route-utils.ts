import { NextResponse } from "next/server";
import { extractBearerToken, verifyToken, type VerifiedUser } from "./server-auth";
import { upsertUser } from "./store";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resolve the authenticated user or throw a 401. */
export async function requireUser(req: Request): Promise<VerifiedUser> {
  const token = extractBearerToken(req.headers);
  const user = await verifyToken(token);
  if (!user) throw new HttpError(401, "Authentication required");
  await upsertUser({
    uid: user.uid,
    email: user.email,
    name: user.name,
    photoURL: user.photoURL,
    provider: user.provider,
  });
  return user;
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message =
    err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Wrap a route handler with error conversion. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return jsonError(err);
    }
  };
}
