// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineId } from "@/theme/timelines";
import { db } from "@/app/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

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
  initialFlips: Flip[];              // expects one flip: [{ flip_id, original, candidates: [] }]
  apiBase: string;                   // unused now (kept for future)
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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [idx, setIdx] = useState(0);
  const [replyDraft, setReplyDraft] = useState("");

  const flip = initialFlips[0] ?? null;

  // Subscribe to this flip's candidates subcollection
  useEffect(() => {
    if (!flip) return;
    const q = query(
      collection(db, "posts", flip.flip_id, "candidates"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Candidate[] = snap.docs.map((d) => ({
          candidate_id: d.id,
          text: (d.data() as any)?.text ?? "",
        }));
        setCandidates(rows);
      },
      (err) => console.error("candidates onSnapshot error:", err)
    );
    return () => unsub();
  }, [flip?.flip_id]);

  // Build cards to display
  const displayCards = useMemo(() => {
    if (!flip) return [];
    const base = [{ key: "original" as const, text: flip.original }];

    const ordered = ORDERED_LENSES
      .map((lens) => candidates.find((c) => c.candidate_id === lens))
      .filter(Boolean)
      .map((c) => ({ key: c!.candidate_id as TimelineId, text: c!.text }));

    if (filterPrompt === "all") {
      return [...base, ...ordered]; // original + any available lens
    } else {
      const found = candidates.find((c) => c.candidate_id === filterPrompt);
      return found ? [{ key: filterPrompt, text: found.text }] : base;
    }
  }, [flip, candidates, filterPrompt]);

  // Looping next/prev
  const goNext = () =>
    setIdx((i) => (displayCards.length === 0 ? 0 : (i + 1) % displayCards.length));
  const goPrev = () =>
    setIdx((i) =>
      displayCards.length === 0 ? 0 : (i - 1 + displayCards.length) % displayCards.length
    );

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayCards.length]);

  // Touch swipe
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -30) goNext();
    if (dx > 30) goPrev();
    startX.current = null;
  };

  useEffect(() => {
    setIdx(0);
  }, [filterPrompt, displayCards.length]);

  const active = displayCards[idx] ?? null;

  if (!flip) return null;

  return (
    <div
      className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Status */}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>{filterPrompt === "all" ? "Default (All)" : `Lens: ${filterPrompt}`}</span>
          {/* If we’re missing some candidates and the user is on "all", hint generation */}
          {filterPrompt === "all" && candidates.length < ORDERED_LENSES.length && (
            <span>· generating…</span>
          )}
        </div>
        <div>
          {displayCards.length > 0 ? `${idx + 1} / ${displayCards.length}` : "0 / 0"}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[120px] whitespace-pre-wrap leading-relaxed">
        {active ? active.text : flip.original}
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

      {/* Reply */}
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
