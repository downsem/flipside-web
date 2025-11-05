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
  apiBase: string; // not used directly here (we call /api/flip relatively)
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

  const current = flips[0]; // one flip w/ many candidates

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
    } else {
      const c = current.candidates.find((x) => x.candidate_id === filterPrompt);
      if (c) return [{ key: filterPrompt as TimelineId, text: c.text }];
      return [originalCard]; // until it gets generated
    }
  }, [current, filterPrompt]);

  // Generate the specific lens once if missing
  const ensureLensGenerated = useCallback(async () => {
    if (!current) return;
    if (filterPrompt === "all") return;
    const exists = current.candidates.some((c) => c.candidate_id === filterPrompt);
    if (exists) return;

    try {
      setLoadingLens(filterPrompt);
      const res = await fetch("/api/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: API expects "lens", not "prompt"
        body: JSON.stringify({ original: current.original, lens: filterPrompt }),
      });
      const data = await res.json();
      if (!data?.ok || !data?.text) throw new Error("bad_response");
      setFlips((prev) => {
        const copy = [...prev];
        copy[0] = {
          ...copy[0],
          candidates: [
            ...copy[0].candidates,
            { candidate_id: filterPrompt, text: data.text as string },
          ],
        };
        return copy;
      });
    } catch (err) {
      console.error("generate lens failed:", err);
    } finally {
      setLoadingLens(null);
    }
  }, [current, filterPrompt]);

  useEffect(() => {
    if (filterPrompt !== "all") {
      void ensureLensGenerated();
    }
    setIdx(0);
  }, [filterPrompt, ensureLensGenerated]);

  // Navigation
  const goNext = () => setIdx((i) => Math.min(i + 1, Math.max(0, displayCards.length - 1)));
  const goPrev = () => setIdx((i) => Math.max(i - 1, 0));

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayCards.length]);

  // Touch
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
      {/* Status */}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>{filterPrompt === "all" ? "Default (All)" : `Lens: ${filterPrompt}`}</span>
          {loadingLens && <span>· generating…</span>}
        </div>
        <div>{displayCards.length > 1 ? `${idx + 1} / ${displayCards.length}` : "1 / 1"}</div>
      </div>

      {/* Text */}
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
