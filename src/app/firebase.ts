// src/app/firebase.ts
// Centralized Firebase initialization + auth/profile helpers for Flipside

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
} from "firebase/firestore";

// Use NEXT_PUBLIC_ env vars so this can be shared client/server safely
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Avoid re-initializing in dev/hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper: ensure user profile doc exists/updated ---
// Stored at: users/{uid}
export async function ensureUserProfile(user: User | null | undefined) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      updatedAt: serverTimestamp(),
      // createdAt will only be set the first time due to merge:true
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// --- Helper: Google sign-in + profile bootstrap ---
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureUserProfile(result.user);
  return result.user;
}

// --- Helper: logout ---
export async function logoutUser() {
  await signOut(auth);
}

// Some code imports `serverTs` as an alias
export const serverTs = serverTimestamp;

// Core exports used across the app
export {
  app,
  auth,
  db,
  serverTimestamp,
  Timestamp,
  GoogleAuthProvider,
  signInWithPopup,
};
