"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import { isFirebaseConfigured } from "./firebase-config";
import type { AuthUser } from "./types";

const DEMO_SESSION_KEY = "gtsdb-cloud:demo-session";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Bearer token sent to the platform API (Firebase ID token or demo token). */
  authToken: string | null;
  firebaseConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string
  ) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Start a local, non-Firebase demo session (works without any config). */
  enterDemo: () => Promise<AuthUser>;
  /** Send the Firebase ID token to the backend so it can verify + upsert the user. */
  registerSession: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(fb: FirebaseUser): AuthUser {
  return {
    uid: fb.uid,
    email: fb.email,
    displayName: fb.displayName,
    photoURL: fb.photoURL,
    provider: "firebase",
  };
}

function loadDemoSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  const firebaseConfigured = isFirebaseConfigured();

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    const auth = getFirebaseAuth();

    if (auth) {
      const unsub1 = onAuthStateChanged(auth, (fbUser) => {
        setUser(fbUser ? toAuthUser(fbUser) : null);
        if (!fbUser) setIdToken(null);
        setLoading(false);
      });
      const unsub2 = onIdTokenChanged(auth, (fbUser) => {
        if (!fbUser) return;
        fbUser
          .getIdToken()
          .then((tok) => setIdToken(tok))
          .catch(() => setIdToken(null));
      });
      unsubs = [unsub1, unsub2];
    } else {
      // Demo mode — restore the local session immediately.
      const demo = loadDemoSession();
      setUser(demo);
      setLoading(false);
    }

    return () => unsubs.forEach((u) => u());
  }, []);

  const demoToken = useMemo(
    () => (user?.provider === "demo" && user ? `demo.${user.uid}` : null),
    [user]
  );

  const authToken = idToken ?? demoToken;

  const registerSession = useCallback(async (token: string) => {
    try {
      await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Non-fatal — the backend will upsert the user on the next request.
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = toAuthUser(cred.user);
      setUser(u);
      return u;
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name?: string): Promise<AuthUser> => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      const u = toAuthUser(cred.user);
      setUser(u);
      return u;
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthUser> => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const u = toAuthUser(cred.user);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (user?.provider === "demo") {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    setUser(null);
    setIdToken(null);
  }, [user]);

  const enterDemo = useCallback(async (): Promise<AuthUser> => {
    const uid = "demo_" + Math.random().toString(36).slice(2, 10);
    const demoUser: AuthUser = {
      uid,
      email: null,
      displayName: "Demo Explorer",
      photoURL: null,
      provider: "demo",
    };
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    authToken,
    firebaseConfigured,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    enterDemo,
    registerSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
