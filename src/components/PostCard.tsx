// src/components/PostCard.tsx
"use client";

import React, { useState } from "react";
import SwipeDeck, { type Flip, type VoteArgs, type ReplyArgs } from "./SwipeDeck";
import type { PromptKey } from "@/utils/prompts";
import type { TimelineId } from "@/theme/timelines";

type Post = {
  id: string;
  originalText: string;
  authorId?: string;
};

type FilterKind = "all" | TimelineId;

export default function PostCard({
  post,
  apiBase,
  filter,
  onVote,
  onReply,
}: {
  post: Post;
  apiBase: string;
  filter?: FilterKind; // "all" | lens id
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
}) {
  const [replyDraft, setReplyDraft] = useState("");

  const initialFlips: Flip[] = [
    {
      flip_id: post.id,
      original: post.originalText,
      candidates: [], // candidates will be hydrated by SwipeDeck’s fetch logic (or remain empty)
    },
  ];

  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm">
      <SwipeDeck
        initialFlips={initialFlips}
        apiBase={apiBase}
        filterPrompt={filter ?? "all"}
        // ✅ pass through the unified signatures (provide safe defaults)
        onVote={onVote ?? (async () => {})}
        onReply={onReply ?? (async () => {})}
      />
    </div>
  );
}
