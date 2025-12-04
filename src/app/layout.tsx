import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Flipside",
  description: "See your posts through five different lenses.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
