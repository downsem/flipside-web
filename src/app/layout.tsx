// src/app/layout.tsx
"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Ensure we always have a user (anonymous) for persistence/feedback
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch((e) =>
          console.error("Anon sign-in failed:", e)
        );
      }
    });
    return () => unsub();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="
          min-h-screen
          bg-[var(--bg)]
          text-[var(--text)]
          transition-colors duration-300
          antialiased
          selection:bg-[var(--accent)]/50
        "
      >
        <ThemeProvider>
          {/* Constrain feed width; adjust as your design evolves */}
          <div id="app-root" className="mx-auto max-w-2xl p-4 sm:p-6">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
