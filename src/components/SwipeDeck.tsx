// src/components/SwipeDeck.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { TimelineId } from "@/theme/timelines";
import type { PromptKey } from "@/utils/prompts";

export type Candidate = { candidate_id: string; text: string };
export type Flip = { flip_id: string; original: string; candidates: Candidate[] };

// Unified arg shapes used across app
export type VoteArgs = {
  index: number;
  key: PromptKey | "original";
  value: "up" | "down";
  text: string;
};

export type ReplyArgs = {
  index: number;
  key: PromptKey | "original";
  text: string;
  flipText: string;
};

type Props = {
  initialFlips: Flip[];
  apiBase: string;

  // "all" shows original + all candidates; otherwise a single lens
  filterPrompt?: TimelineId | "all";

  // ✅ New, unified signatures
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
};

export default function SwipeDeck({
  initialFlips,
  apiBase,
  filterPrompt = "all",
  onVote,
  onReply,
}: Props) {
  // NOTE: Keep your existing implementation here. The important change is the prop types above.
  // Below is a lightweight implementation to avoid type errors and to keep UI working.

  const [idx, setIdx] = useState(0);
  const flips = initialFlips;

  const current = flips[idx];

  const visibleCards = useMemo(() => {
    if (!current) return [];
    if (filterPrompt === "all") {
      return [
        { key: "original" as const, text: current.original },
        ...current.candidates.map((c) => ({ key: c.candidate_id as PromptKey, text: c.text })),
      ];
    } else {
      // show only the candidate that matches this prompt id (by candidate_id)
      const match = current.candidates.find((c) => c.candidate_id === filterPrompt);
      return match ? [{ key: match.candidate_id as PromptKey, text: match.text }] : [];
    }
  }, [current, filterPrompt]);

  if (!current) return null;

  const goNext = () => setIdx((n) => Math.min(n + 1, flips.length - 1));

  async function handleVote(dir: "up" | "down") {
    if (!visibleCards.length) return;
    const card = visibleCards[0];
    const payload: VoteArgs = {
      index: idx,
      key: card.key,
      value: dir,
      text: card.text,
    };
    await onVote?.(payload);
    goNext();
  }

  async function handleReply(text: string) {
    if (!visibleCards.length) return;
    const card = visibleCards[0];
    const payload: ReplyArgs = {
      index: idx,
      key: card.key,
      text,
      flipText: card.text,
    };
    await onReply?.(payload);
  }

  return (
    <div className="rounded-2xl border p-4 bg-white">
      {/* Card */}
      <div className="min-h-[140px] whitespace-pre-wrap leading-relaxed">
        {visibleCards.length ? visibleCards[0].text : "No content for this filter."}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleVote("down")}
          className="rounded-lg border px-3 py-1"
        >
          👎
        </button>
        <button
          type="button"
          onClick={() => handleVote("up")}
          className="rounded-lg border px-3 py-1"
        >
          👍
        </button>
        {/* Minimal reply box (optional) */}
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const txt = (fd.get("reply") as string) || "";
            if (txt.trim()) handleReply(txt.trim());
            (e.currentTarget.elements.namedItem("reply") as HTMLInputElement).value = "";
          }}
        >
          <input
            name="reply"
            placeholder="Reply…"
            className="border rounded-lg px-2 py-1 text-sm"
          />
          <button className="rounded-lg bg-black text-white px-3 py-1 text-sm" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
