// src/components/PostCard.tsx
"use client";

import React, { useMemo } from "react";
import SwipeDeck from "./SwipeDeck";
import type { TimelineId } from "@/theme/timelines";

type Candidate = {
  candidate_id: string;
  text: string;
  timeline_id?: TimelineId;
};

type Post = {
  id: string;
  originalText: string;

  // Any of these shapes may exist depending on your API:
  candidates?: Candidate[];                            // shape A
  variants?: Partial<Record<TimelineId, string>>;      // shape B
  flips?: Array<{ key: string; text: string; id?: string }>; // shape C

  // other fields...
};

const TL_KEYS: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

/** Normalize whatever the API returns into a Candidate[] for SwipeDeck */
function normalizeCandidates(post: Post): Candidate[] {
  // A) Already in the desired array shape
  if (Array.isArray(post.candidates)) {
    return post.candidates
      .filter((c) => c && typeof c.text === "string")
      .map((c, i) => ({
        candidate_id: c.candidate_id ?? `cand-${i}`,
        text: c.text,
        timeline_id: c.timeline_id as TimelineId | undefined,
      }));
  }

  // B) Object keyed by timeline id: { calm: "text", bridge: "text", ... }
  if (post.variants && typeof post.variants === "object") {
    return TL_KEYS
      .filter((k) => typeof post.variants?.[k] === "string")
      .map((k, i) => ({
        candidate_id: `cand-${k}-${i}`,
        text: post.variants![k] as string,
        timeline_id: k,
      }));
  }

  // C) Array with { key, text, id? } where key is a timeline id string
  if (Array.isArray(post.flips)) {
    return post.flips
      .filter((f) => f && typeof f.text === "string")
      .map((f, i) => {
        const maybeTl = TL_KEYS.includes(f.key as TimelineId)
          ? (f.key as TimelineId)
          : undefined;
        return {
          candidate_id: f.id ?? `cand-${f.key ?? "unk"}-${i}`,
          text: f.text,
          timeline_id: maybeTl,
        };
      });
  }

  // Fallback: no variants
  return [];
}

type Props = {
  post: Post;
  apiBase: string; // kept for future use
};

export default function PostCard({ post }: Props) {
  const initialFlips = useMemo(() => {
    const candidates = normalizeCandidates(post);
    return [
      {
        flip_id: post.id,
        original: post.originalText,
        candidates, // zero or more variants
      },
    ];
  }, [post]);

  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm overscroll-contain tap-transparent">
      <SwipeDeck initialFlips={initialFlips} />
    </div>
  );
}
