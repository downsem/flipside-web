// src/app/post/[postId]/page.tsx
import PostPageClient from "./page.client";

export default function PostPage({
  params,
}: {
  params: { postId: string };
}) {
  return <PostPageClient postId={params.postId} />;
}
