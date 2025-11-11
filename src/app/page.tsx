// Server Component wrapper for the homepage.
// Do NOT put "use client" in this file.

export const dynamic = "force-dynamic";
// Must be a number (seconds) or false — NOT an object.
export const revalidate = 0;

import PageClient from "./page.client";

export default function Page() {
  return <PageClient />;
}
