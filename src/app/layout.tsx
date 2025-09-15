"use client";
import "./globals.css";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export default function RootLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch((e) => console.error("Anon sign-in failed:", e));
    });
    return () => unsub();
  }, []);

  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}