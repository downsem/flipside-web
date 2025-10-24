// src/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import HomeClient from "./page.client";

export default function Page() {
  return <HomeClient />;
}
