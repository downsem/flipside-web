// src/components/PostCard.tsx
"use client";

import React from "react";
import SwipeDeck from "./SwipeDeck";

type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: any;
};

type Props = {
  post: Post;
  apiBase: string; // still accepted from callers but not needed by SwipeDeck now
};

export default function PostCard({ post }: Props) {
  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm overscroll-contain tap-transparent">
      {/* New SwipeDeck API: no initialFlips/onVote/onReply props */}
      <SwipeDeck originalText={post.originalText} />
    </div>
  );
}
