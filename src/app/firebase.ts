// src/app/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app"; // <-- type-only import (required)
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Reuse the app if it already exists (Vercel/Next hot reload safe)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Ensure an auth session exists (anonymous is fine for MVP)
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (u) => {
    if (!u) {
      signInAnonymously(auth).catch((e) =>
        console.error("Anon sign-in failed:", e)
      );
    }
  });
}

export default app;
