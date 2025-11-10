// src/app/add/page.tsx
export const dynamic = "force-dynamic";  // ✅ server-only export OK here
export const revalidate = 0;             // ✅ server-only export OK here

import AddPageClient from "./page.client";

export default function AddPage() {
  // Pure server wrapper. No "use client" here.
  return <AddPageClient />;
}
