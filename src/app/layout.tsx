// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import { ThemeProvider } from "@/context/ThemeContext";
import { FeedFilterProvider } from "@/context/FeedFilterContext"; // 👈 make sure this path matches your file

export const metadata: Metadata = {
  title: "FlipSide",
  description: "See your post through different lenses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <FeedFilterProvider>
            {children}
          </FeedFilterProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
