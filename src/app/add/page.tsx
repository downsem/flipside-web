// Server Component wrapper for the Add page.
// Do NOT put "use client" in this file.

export const dynamic = "force-dynamic";
export const revalidate = 0;

import AddClient from "./page.client"; // <- your client file for /add
export default function AddPage() {
  return <AddClient />;
}
