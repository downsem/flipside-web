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

// Order to show lenses in the "All" deck
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
  const [localReplies, setLocalReplies] = useState<
    Array<{ key: TimelineId | "original"; text: string; at: number }>
  >([]);
  const [idx, setIdx] = useState(0);
  const [loadingLens, setLoadingLens] = useState<string | null>(null);

  const current = flips[0]; // single-post deck (one flip with many candidates)

  // Build the display stack depending on filter
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
      // single lens
      const c = current.candidates.find((x) => x.candidate_id === filterPrompt);
      if (c) return [{ key: filterPrompt as TimelineId, text: c.text }];
      return [originalCard]; // until we generate
    }
  }, [current, filterPrompt]);

  const active = displayCards[idx] ?? null;

  // ---- Generation helpers ----

  // Generate a specific lens if missing
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
          // IMPORTANT: API expects 'lens', not 'prompt'
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
      } catch (err) {
        console.error("generate lens failed:", err);
      } finally {
        setLoadingLens(null);
      }
    },
    [current]
  );

  // If user switches to a lens that hasn't been generated yet, fetch it once
  useEffect(() => {
    if (!current) return;
    setIdx(0);

    if (filterPrompt !== "all") {
      void generateLens(filterPrompt);
    }
  }, [filterPrompt, current, generateLens]);

  // In "all" mode, generate all lenses in the background so Next/Prev works immediately
  useEffect(() => {
    if (!current) return;
    if (filterPrompt !== "all") return;

    (async () => {
      for (const lens of ORDERED_LENSES) {
        const exists = current.candidates.some((c) => c.candidate_id === lens);
        if (!exists) {
          await generateLens(lens);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.flip_id, filterPrompt]); // run once for this flip in "all"

  // ---- Navigation (keyboard + touch) ----

  const goNext = useCallback(
    () => setIdx((i) => Math.min(i + 1, Math.max(0, displayCards.length - 1))),
    [displayCards.length]
  );
  const goPrev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

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
          {loadingLens && <span>· generating…</span>}
        </div>
        <div>{displayCards.length > 1 ? `${idx + 1} / ${displayCards.length}` : "1 / 1"}</div>
      </div>

      {/* Card content */}
      <div className="min-h-[120px] whitespace-pre-wrap leading-relaxed">
        {active ? active.text : current.original}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => goPrev()}
            disabled={idx === 0}
          >
            ◀ Prev
          </button>
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => goNext()}
            disabled={idx >= displayCards.length - 1}
          >
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
          onClick={async () => {
            if (!active) return;
            const payload = {
              index: idx,
              key: (active.key as any) ?? "original",
              text: replyDraft.trim(),
              flipText: active.text,
            };
            setLocalReplies((r) => [
              ...r,
              { key: payload.key, text: payload.text, at: Date.now() },
            ]);
            setReplyDraft("");
            await onReply?.(payload);
          }}
        >
          Send
        </button>
      </div>

      {/* Local replies list (optimistic) */}
      {localReplies.length > 0 && (
        <div className="mt-3 space-y-2">
          {localReplies.map((r, i) => (
            <div key={`${r.at}-${i}`} className="rounded-lg bg-gray-50 p-2 text-sm">
              <span className="mr-2 text-gray-400">↪</span>
              {r.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
