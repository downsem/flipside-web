// src/components/PostCard.tsx
"use client";

import React, { useState } from "react";
import SwipeDeck from "./SwipeDeck";
import type { PromptKey } from "@/utils/prompts";

type Post = {
  id: string;
  originalText: string;
  authorId?: string;
};

type Candidate = { candidate_id: string; text: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

export default function PostCard({
  post,
  apiBase,
}: {
  post: Post;
  apiBase: string;
}) {
  // (MVP) local draft just to keep text while user types
  const [replyDraft, setReplyDraft] = useState("");

  const initialFlips: Flip[] = [
    {
      flip_id: post.id,
      original: post.originalText,
      candidates: [],
    },
  ];

  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm">
      <SwipeDeck
        initialFlips={initialFlips}
        apiBase={apiBase}
        onVote={async ({
          key,
          value,
          text,
          index,
        }: {
          index: number;
          key: PromptKey | "original";
          value: "up" | "down" | null;
          text: string;
        }) => {
          if (!value) return;
          // place to persist vote if you want
          // await saveFlipVote({ postId: post.id, key, value, text, index })
        }}
        onReply={async ({
          key,
          text,
          flipText,
          index,
        }: {
          index: number;
          key: PromptKey | "original";
          text: string;
          flipText: string;
        }) => {
          // place to persist reply if you want
          // await saveFlipReply({ postId: post.id, key, text, flipText, index })
          setReplyDraft("");
        }}
      />
    </div>
  );
}
