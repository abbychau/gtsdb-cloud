"use client";

// Client-side Firebase initialisation. This module is only imported from
// client components. It returns a lazily-created Auth instance, or null when
// Firebase is not configured (in which case the app uses Demo mode).

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config";

let authInstance: Auth | null = null;
let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    appInstance = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!authInstance) {
    const app = getFirebaseApp();
    if (!app) return null;
    authInstance = getAuth(app);
  }
  return authInstance;
}
