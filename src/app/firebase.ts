// src/app/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase config (copied from Firebase Console, fixed storageBucket)
const firebaseConfig = {
  apiKey: "AIzaSyB1cBwvuxUzLf6M7mrdYB_oIB8HN-9sXik",
  authDomain: "flipside-app-v2.firebaseapp.com",
  projectId: "flipside-app-v2",
  storageBucket: "flipside-app-v2.appspot.com",
  messagingSenderId: "331956299764",
  appId: "1:331956299764:web:f2d7cab09939cf6918bba1",
  measurementId: "G-RDWEEDMSE2"
};

// Ensure singleton app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Needed for createdAt fields
export { serverTimestamp };
