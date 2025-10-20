// src/components/PostCard.tsx
"use client";

import React, { useState } from "react";
import SwipeDeck from "./SwipeDeck";
import type { PromptKey } from "@/utils/prompts";
import type { TimelineId } from "@/theme/timelines";

type FilterKind = "all" | TimelineId;

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
  filter,
}: {
  post: Post;
  apiBase: string;
  filter: FilterKind;
}) {
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
        filterPrompt={filter}   // <— NEW
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
          // persist if desired
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
          // persist if desired
          setReplyDraft("");
        }}
      />
    </div>
  );
}
