// src/components/PostCard.tsx
"use client";

import React from "react";
import SwipeDeck from "./SwipeDeck";
import type { TimelineId } from "@/theme/timelines";

// Keep this in sync with what SwipeDeck calls back with
export type VoteArgs = {
  index: number;
  key: TimelineId | "original";
  value: "up" | "down" | null;
  text: string;
};

// Minimal post shape used by this component
export type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: any;
};

type Props = {
  post: Post;
  apiBase: string;
  // Filter passed from HomePage: "all" means show original + all flips
  filter: "all" | TimelineId;
  // NEW: align with SwipeDeck’s callback signature
  onVote?: (args: VoteArgs) => void | Promise<void>;
};

export default function PostCard({
  post,
  apiBase,
  filter,
  onVote,
}: Props) {
  return (
    <div className="rounded-3xl bg-white shadow-sm p-4 md:p-6">
      <SwipeDeck
        post={post}
        apiBase={apiBase}
        // renamed in SwipeDeck to clarify what it filters by
        filterPrompt={filter}
        // Forward as-is; provide a no-op default to avoid undefined checks
        onVote={onVote ?? (() => {})}
      />
    </div>
  );
}
