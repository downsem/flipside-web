"use client";

import React, { useMemo, useState } from "react";
import SwipeDeck from "./SwipeDeck";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../app/firebase";
import { saveFlipVote, saveFlipReply } from "../lib/flipsPersistence";
import { useFeedFilter } from "@/context/FeedFilterContext";
import type { TimelineId } from "@/theme/timelines";

type Candidate = { candidate_id: string; text: string; promptKind?: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: any;
};

type Props = {
  post: Post;
  apiBase: string;
};

export default function PostCard({ post, apiBase }: Props) {
  const [user] = useAuthState(auth);
  const userId = user?.uid || "anon";
  const { selectedPrompt } = useFeedFilter();

  // Construct initialFlips for SwipeDeck based on filter
  const initialFlips: Flip[] = useMemo(() => {
    // when filtered → do NOT include original; only the selected prompt
    if (selectedPrompt) {
      return [
        {
          flip_id: `${post.id}-${selectedPrompt}`,
          original: post.originalText,
          candidates: [
            { candidate_id: `${post.id}-${selectedPrompt}-c0`, text: "", promptKind: selectedPrompt }
          ],
        },
      ];
    }

    // unfiltered → show "original" followed by the prompt flips (Deck handles generation/fill)
    return [
      {
        flip_id: `${post.id}-deck`,
        original: post.originalText,
        candidates: [
          // empty seed; SwipeDeck will fetch/generate and fill these by prompt order
          { candidate_id: `${post.id}-calm-c0`, text: "", promptKind: "calm" as TimelineId },
          { candidate_id: `${post.id}-bridge-c0`, text: "", promptKind: "bridge" as TimelineId },
          { candidate_id: `${post.id}-cynical-c0`, text: "", promptKind: "cynical" as TimelineId },
          { candidate_id: `${post.id}-opposite-c0`, text: "", promptKind: "opposite" as TimelineId },
          { candidate_id: `${post.id}-playful-c0`, text: "", promptKind: "playful" as TimelineId },
        ],
      },
    ];
  }, [post.id, post.originalText, selectedPrompt]);

  const [replyDraft, setReplyDraft] = useState("");

  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm overscroll-contain tap-transparent">
      <SwipeDeck
        initialFlips={initialFlips}
        apiBase={apiBase}
        filterPrompt={selectedPrompt}
        onVote={async ({ key, value, text, index }) => {
          if (!value) return;
          await saveFlipVote({
            postId: post.id,
            flipIndex: index,
            promptKey: key as any,
            direction: value,
            text,
            userId,
          });
        }}
        onReply={async ({ key, text, flipText, index }) => {
          await saveFlipReply({
            postId: post.id,
            flipIndex: index,
            promptKey: key as any,
            text: flipText,
            replyBody: text,
            userId,
          });
          setReplyDraft("");
        }}
        replyDraft={replyDraft}
        setReplyDraft={setReplyDraft}
      />
    </div>
  );
}
