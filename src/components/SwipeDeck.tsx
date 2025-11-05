// src/components/SwipeDeck.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  apiBase,
  filterPrompt,
  onVote,
  onReply,
}: Props) {
  const [flips, setFlips] = useState<Flip[]>(initialFlips);
  const [replyDraft, setReplyDraft] = useState("");
  const [idx, setIdx] = useState(0);
  const [loadingLens, setLoadingLens] = useState<string | null>(null);

  const current = flips[0];

  // Build the display stack
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
      return [originalCard, ...ordered];
    }

    const c = current.candidates.find((x) => x.candidate_id === filterPrompt);
    if (c) return [{ key: filterPrompt as TimelineId, text: c.text }];
    return [originalCard]; // temporary until we generate
  }, [current, filterPrompt]);

  // Generate one lens
  const generateLens = useCallback(
    async (lens: TimelineId) => {
      if (!current) return;
      const exists = current.candidates.some((c) => c.candidate_id === lens);
      if (exists) return;

      try {
        setLoadingLens(lens);
        const res = await fetch("/api/flip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ original: current.original, lens }),
        });
        const data = await res.json();
        if (!data?.ok || !data?.text) throw new Error("bad_response");
        setFlips((prev) => {
          const copy = [...prev];
          copy[0] = {
            ...copy[0],
            candidates: [...copy[0].candidates, { candidate_id: lens, text: data.text as string }],
          };
          return copy;
        });
      } catch (e) {
        console.error("generate lens failed:", e);
        alert("Could not generate rewrite. Try again.");
      } finally {
        setLoadingLens(null);
      }
    },
    [current]
  );

  // If user switches to a single lens, ensure it exists
  useEffect(() => {
    if (!current) return;
    setIdx(0);
    if (filterPrompt !== "all") {
      void generateLens(filterPrompt as TimelineId);
    }
  }, [filterPrompt, current, generateLens]);

  // Next/Prev (+ auto-generate missing lenses when in "all")
  const goNext = useCallback(async () => {
    if (!current) return;

    if (filterPrompt === "all") {
      // compute next index and ensure that card exists (generate the next missing lens)
      const nextIdx = Math.min(idx + 1, Math.max(0, displayCards.length)); // allow stepping to a yet-missing lens
      // which lens would that be?
      const have = new Set(current.candidates.map((c) => c.candidate_id));
      const missingOrder = ORDERED_LENSES.filter((l) => !have.has(l));
      if (nextIdx >= displayCards.length && missingOrder.length > 0) {
        await generateLens(missingOrder[0]);
      }
      setIdx((i) => Math.min(i + 1, Math.max(0, displayCards.length)));
    } else {
      setIdx((i) => Math.min(i + 1, Math.max(0, displayCards.length - 1)));
    }
  }, [current, displayCards.length, filterPrompt, idx, generateLens]);

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") void goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // touch
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -30) void goNext();
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
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>{filterPrompt === "all" ? "Default (All)" : `Lens: ${filterPrompt}`}</span>
          {loadingLens && <span>· generating…</span>}
        </div>
        <div>{displayCards.length > 1 ? `${idx + 1} / ${displayCards.length}` : "1 / 1"}</div>
      </div>

      <div className="min-h-[120px] whitespace-pre-wrap leading-relaxed">
        {active ? active.text : current.original}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={goPrev}>
            ◀ Prev
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => void goNext()}>
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
              void goNext();
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
              void goNext();
            }}
          >
            👎
          </button>
        </div>
      </div>

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
