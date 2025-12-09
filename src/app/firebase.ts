// src/app/firebase.ts
// Centralized Firebase initialization for Flipside

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// IMPORTANT:
// We only use NEXT_PUBLIC_ env vars here so this module can be shared
// between client and server code safely.
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

// Client-side auth & shared Firestore instance
const auth = getAuth(app);
const db = getFirestore(app);

// Re-export helpers used across the app
export {
  app,
  auth,
  db,
  serverTimestamp,
  Timestamp,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
};
