// src/app/firebase.ts
"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// ---- Config from env (NEXT_PUBLIC_... so it’s available client-side) ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Reuse the app if it already exists (avoids HMR duplicates)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Ensure we only wire the auth listener once (even across HMR)
declare global {
  // eslint-disable-next-line no-var
  var __FS_AUTH_WIRED__: boolean | undefined;
}

if (typeof window !== "undefined" && !globalThis.__FS_AUTH_WIRED__) {
  globalThis.__FS_AUTH_WIRED__ = true;

  onAuthStateChanged(auth, (u) => {
    if (!u) {
      // Keep an anonymous session for Firestore rules requiring auth
      signInAnonymously(auth).catch((e) => {
        console.error("[firebase] Anonymous sign-in failed:", e);
      });
    } else {
      // Optional debug: comment out if noisy
      // console.debug("[firebase] signed in as:", u.uid);
    }
  });
}
