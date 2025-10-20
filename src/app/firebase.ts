// src/app/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Initialize exactly once (works in hot-reload and on Vercel)
const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      });

export const db = getFirestore(app);
export const auth = getAuth(app);

// Ensure we always have a session (anonymous is fine for MVP)
onAuthStateChanged(auth, (u) => {
  if (!u) {
    signInAnonymously(auth).catch((e) =>
      console.error("Anon sign-in failed:", e)
    );
  }
});
