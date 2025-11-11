// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineId } from "@/theme/timelines";
import { db } from "@/app/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export type Candidate = { candidate_id: TimelineId; text: string };
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
  initialFlips: Flip[];        // single flip for the card
  apiBase: string;             // unused now, kept for prop compatibility
  filterPrompt: "all" | TimelineId;
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
};

const ORDERED_LENSES: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

export default function SwipeDeck({
  initialFlips,
  apiBase,
  filterPrompt,
  onVote,
  onReply,
}: Props) {
  const [flips, setFlips] = useState<Flip[]>(initialFlips);
  const [replyDraft, setReplyDraft] = useState("");
  const [idx, setIdx] = useState(0);

  const current = flips[0]; // one flip per PostCard

  // Live-subscribe to rewrites stored under Firestore
  useEffect(() => {
    if (!current?.flip_id) return;
    const col = collection(db, "posts", current.flip_id, "rewrites");
    const off = onSnapshot(col, (snap) => {
      const candidates: Candidate[] = [];
      snap.forEach((d) => {
        const lens = d.id as TimelineId;
        const text = (d.data() as any)?.text ?? "";
        if (ORDERED_LENSES.includes(lens) && text) {
          candidates.push({ candidate_id: lens, text });
        }
      });
      // keep the original, replace candidates from Firestore
      setFlips([{ ...current, candidates }]);
    });
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.flip_id]);

  // Build the visible stack for this post
  const displayCards = useMemo(() => {
    if (!current) return [];
    const originalCard = { key: "original" as const, text: current.original };

    const ordered = ORDERED_LENSES
      .map((id) => current.candidates.find((c) => c.candidate_id === id))
      .filter(Boolean)
      .map((c) => ({ key: c!.candidate_id, text: c!.text })) as Array<{
      key: TimelineId;
      text: string;
    }>;

    if (filterPrompt === "all") {
      return [originalCard, ...ordered];
    } else {
      const c = current.candidates.find((x) => x.candidate_id === filterPrompt);
      return c ? [{ key: c.candidate_id, text: c.text }] : [originalCard];
    }
  }, [current, filterPrompt]);

  // Next/Prev – loop within the stack
  const goNext = () =>
    setIdx((i) => (displayCards.length > 0 ? (i + 1) % displayCards.length : 0));
  const goPrev = () =>
    setIdx((i) =>
      displayCards.length > 0 ? (i - 1 + displayCards.length) % displayCards.length : 0
    );

  // keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayCards.length]);

  // touch swipe
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
          {displayCards.length > 0 ? `${(idx + 1)} / ${displayCards.length}` : "1 / 1"}
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
              goNext();
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
              goNext();
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
