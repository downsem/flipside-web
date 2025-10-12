"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import { ThemeProvider } from "@/context/ThemeContext";

/**
 * RootLayout:
 * - Initializes Firebase anonymous auth on first load.
 * - Wraps the app in ThemeProvider so timeline colors/patterns are reactive.
 * - Applies CSS variables for background/text from ThemeContext.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  // Maintain anonymous auth session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((e) =>
          console.error("Anon sign-in failed:", e)
        );
      }
    });
    return () => unsub();
  }, []);

  return (
    <html lang="en">
      <body
        className="
          bg-[var(--bg)]
          text-[var(--text)]
          transition-colors
          duration-300
          min-h-screen
          font-sans
          antialiased
        "
      >
        <ThemeProvider>
          {/* Everything below can read theme colors via CSS vars or useTheme() */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
