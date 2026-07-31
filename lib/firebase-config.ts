// Firebase web configuration.
//
// These NEXT_PUBLIC_* values are intentionally public (Firebase web config is
// public by design) and are read from the environment. If any of the required
// fields are missing the app falls back to a local "Demo mode" so you can try
// the whole platform without configuring Firebase.
//
// See `.env.local.example` for instructions.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

/** True when a real Firebase project is configured. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey.length >= 20 &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

/** The numeric Firebase project number (used for docs/quickstart snippets). */
export const FIREBASE_PROJECT_NUMBER = "628700320308";
