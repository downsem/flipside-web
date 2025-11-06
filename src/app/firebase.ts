// src/app/firebase.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, serverTimestamp as fsServerTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const serverTimestamp = fsServerTimestamp;

onAuthStateChanged(auth, (u) => {
  if (!u) {
    signInAnonymously(auth).catch((err) => {
      console.error("Anon sign-in failed:", err);
    });
  }
});
// --- TEMP DEBUG (safe to leave; only available in browser) ---
if (typeof window !== "undefined") {
  (window as any).__flipside = {
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
    },
    get uid() {
      return auth.currentUser?.uid ?? null;
    },
  };
}
