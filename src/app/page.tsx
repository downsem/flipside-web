// src/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import HomeClient from "./page.client";

export default function Page() {
  // This file runs on the server only.
  // It wraps the client component so Next.js can handle revalidate/dynamic correctly.
  return <HomeClient />;
}
