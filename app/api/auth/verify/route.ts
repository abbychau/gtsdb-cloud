import { NextResponse, type NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/server-auth";
import { upsertUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const token = body.token || extractBearerToken(req.headers);
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  }

  await upsertUser({
    uid: user.uid,
    email: user.email,
    name: user.name,
    photoURL: user.photoURL,
    provider: user.provider,
  });

  return NextResponse.json({
    user: {
      uid: user.uid,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      provider: user.provider,
    },
  });
}
