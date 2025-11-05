"use client";

import React from "react";
import SwipeDeck from "./SwipeDeck";

import type { TimelineId } from "@/theme/timelines";
import type { Flip, VoteArgs, ReplyArgs } from "./SwipeDeck";

type Post = {
  id: string;
  originalText: string;
  authorId?: string;
};

export type FilterKind = "all" | TimelineId;

type Props = {
  post: Post;
  apiBase: string;
  filter: FilterKind;
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
};

export default function PostCard({
  post,
  apiBase,
  filter,
  onVote,
  onReply,
}: Props) {
  const initialFlips: Flip[] = [
    {
      flip_id: post.id,
      original: post.originalText,
      candidates: [],
    },
  ];

  return (
    <SwipeDeck
      initialFlips={initialFlips}
      apiBase={apiBase}
      filterPrompt={filter}
      onVote={onVote}
      onReply={onReply}
    />
  );
}
