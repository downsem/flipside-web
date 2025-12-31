// src/app/post/[postId]/page.tsx
import PostPageClient from "./page.client.tsx";

export default function PostPage({
  params,
}: {
  params: { postId: string };
}) {
  return <PostPageClient postId={params.postId} />;
}
