// src/app/add/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import AddClient from "./page.client";

export default function Page() {
  return <AddClient />;
}
