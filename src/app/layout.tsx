// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Flipside",
  description: "Flip your posts into multiple timelines.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
