// src/app/share/[postId]/page.tsx
import SharePageClient from "./page.client.tsx";

export default function SharePage({
  params,
}: {
  params: { postId: string };
}) {
  return <SharePageClient postId={params.postId} />;
}
