// Server-side token verification for the platform API.
//
// Two token types are accepted:
//   1. Firebase ID tokens — verified against the Firebase Identity Toolkit
//      using the public web API key (no service account needed).
//   2. Demo tokens ("demo.<uid>") — used when Firebase is not configured so
//      the platform remains fully explorable locally.

export interface VerifiedUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  provider: "firebase" | "demo";
}

export function getFirebaseApiKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

export function isFirebaseConfiguredServer(): boolean {
  const key = getFirebaseApiKey();
  return key.length >= 20;
}

/** Verify a demo token of the form `demo.<uid>`. */
function verifyDemoToken(token: string): VerifiedUser | null {
  const prefix = "demo.";
  if (!token.startsWith(prefix)) return null;
  const uid = token.slice(prefix.length).trim();
  if (!uid) return null;
  return {
    uid,
    email: `${uid}@demo.gtsdb.cloud`,
    name: "Demo Explorer",
    photoURL: null,
    provider: "demo",
  };
}

/** Verify a Firebase ID token using the Identity Toolkit lookup endpoint. */
async function verifyFirebaseToken(token: string): Promise<VerifiedUser | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        displayName?: string;
        photoUrl?: string;
      }>;
    };
    const u = data.users?.[0];
    if (!u?.localId) return null;
    return {
      uid: u.localId,
      email: u.email ?? null,
      name: u.displayName ?? null,
      photoURL: u.photoUrl ?? null,
      provider: "firebase",
    };
  } catch {
    return null;
  }
}

/** Verify a bearer token and return the user, or null when invalid. */
export async function verifyToken(
  token: string | null | undefined
): Promise<VerifiedUser | null> {
  if (!token) return null;
  const demo = verifyDemoToken(token);
  if (demo) return demo;
  if (isFirebaseConfiguredServer()) {
    return verifyFirebaseToken(token);
  }
  // Firebase not configured — demo tokens are the only valid option.
  return null;
}

/** Extract the bearer token from a request's Authorization header. */
export function extractBearerToken(
  headers: Headers
): string | null {
  const auth = headers.get("authorization");
  if (!auth) return null;
  const [scheme, ...rest] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return rest.join(" ").trim() || null;
}
