"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineId } from "@/theme/timelines";

export type Candidate = { candidate_id: string; text: string };
export type Flip = { flip_id: string; original: string; candidates: Candidate[] };

export type VoteArgs = {
  index: number;
  key: TimelineId | "original";
  value: "up" | "down";
  text: string;
};

export type ReplyArgs = {
  index: number;
  key: TimelineId | "original";
  text: string;
  flipText: string;
};

type Props = {
  initialFlips: Flip[];
  apiBase: string;
  filterPrompt: "all" | TimelineId;
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
};

const ORDERED_LENSES: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

export default function SwipeDeck({
  initialFlips,
  apiBase,          // reserved (not used here)
  filterPrompt,
  onVote,
  onReply,
}: Props) {
  const [flips] = useState<Flip[]>(initialFlips); // single flip (deck)
  const [idx, setIdx] = useState(0);
  const [replyDraft, setReplyDraft] = useState("");

  const current = flips[0];

  // Build the display stack (never re-generates; shows what exists)
  const displayCards = useMemo(() => {
    if (!current) return [];
    const originalCard = { key: "original" as const, text: current.original };

    if (filterPrompt === "all") {
      const ordered = ORDERED_LENSES
        .map((id) => {
          const c = current.candidates.find((x) => x.candidate_id === id);
          return c ? ({ key: id, text: c.text } as const) : null;
        })
        .filter(Boolean) as Array<{ key: TimelineId; text: string }>;
      // Original first, then whatever candidates exist (up to 5). No dupes, no regen.
      return [originalCard, ...ordered];
    } else {
      const c = current.candidates.find((x) => x.candidate_id === filterPrompt);
      return c ? [{ key: filterPrompt, text: c.text }] : [originalCard];
    }
  }, [current, filterPrompt]);

  // Looping next/prev
  const goNext = () => {
    if (displayCards.length === 0) return;
    setIdx((i) => (i + 1) % displayCards.length);
  };
  const goPrev = () => {
    if (displayCards.length === 0) return;
    setIdx((i) => (i - 1 + displayCards.length) % displayCards.length);
  };

  // Reset index when filter changes or deck changes
  useEffect(() => {
    setIdx(0);
  }, [filterPrompt, displayCards.length]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayCards.length]);

  // touch
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -30) goNext();
    if (dx > 30) goPrev();
    touchStartX.current = null;
  };

  const active = displayCards[idx] ?? null;
  if (!current) return null;

  return (
    <div
      className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Status bar */}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>{filterPrompt === "all" ? "Default (All)" : `Lens: ${filterPrompt}`}</span>
        </div>
        <div>
          {displayCards.length > 0 ? `${idx + 1} / ${displayCards.length}` : "0 / 0"}
        </div>
      </div>

      {/* Card content */}
      <div className="min-h-[120px] whitespace-pre-wrap leading-relaxed">
        {active ? active.text : current.original}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={goPrev}>
            ◀ Prev
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={goNext}>
            Next ▶
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => {
              if (!active) return;
              onVote?.({
                index: idx,
                key: (active.key as any) ?? "original",
                value: "up",
                text: active.text,
              });
            }}
          >
            👍
          </button>
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => {
              if (!active) return;
              onVote?.({
                index: idx,
                key: (active.key as any) ?? "original",
                value: "down",
                text: active.text,
              });
            }}
          >
            👎
          </button>
        </div>
      </div>

      {/* Reply box */}
      <div className="mt-3 flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Reply…"
          value={replyDraft}
          onChange={(e) => setReplyDraft(e.target.value)}
        />
        <button
          className="rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
          disabled={!active || replyDraft.trim().length === 0}
          onClick={() => {
            if (!active) return;
            onReply?.({
              index: idx,
              key: (active.key as any) ?? "original",
              text: replyDraft.trim(),
              flipText: active.text,
            });
            setReplyDraft("");
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
