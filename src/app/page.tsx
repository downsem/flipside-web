// src/app/page.tsx
import HomePageClient from "./page.client";

export const revalidate = 0;

export default function HomePage() {
  return <HomePageClient />;
}
