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

// fixed order for the deck
const ORDERED_LENSES: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];
const ORDER_ALL: Array<TimelineId | "original"> = ["original", ...ORDERED_LENSES];

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

  // prevent duplicate POSTs for the same lens during a session
  const requested = useRef<Set<string>>(new Set());

  const current = flips[0]; // one flip per card stack

  // Map candidates by id for quick lookup
  const byId = useMemo(() => {
    const m = new Map<string, string>();
    if (current) {
      for (const c of current.candidates) m.set(c.candidate_id, c.text);
    }
    return m;
  }, [current]);

  // Build deck data
  const displayCards = useMemo(() => {
    if (!current) return [];

    if (filterPrompt === "all") {
      // fixed 6 cards
      return ORDER_ALL.map((k) => {
        if (k === "original") {
          return { key: "original" as const, text: current.original, hasText: true };
        }
        const t = byId.get(k);
        return {
          key: k,
          text: t ?? "(Generating…)", // will kick off generation on first view
          hasText: Boolean(t),
        } as { key: TimelineId; text: string; hasText: boolean };
      });
    }

    // single-lens mode: single card
    if (ORDERED_LENSES.includes(filterPrompt)) {
      const t = byId.get(filterPrompt);
      return [
        {
          key: filterPrompt,
          text: t ?? "(Generating…)",
          hasText: Boolean(t),
        } as { key: TimelineId; text: string; hasText: boolean },
      ];
    }

    // fallback: original only
    return [{ key: "original" as const, text: current.original, hasText: true }];
  }, [current, filterPrompt, byId]);

  // Generate a specific lens once
  const generateLens = useCallback(
    async (lens: TimelineId) => {
      if (!current) return;
      if (byId.get(lens)) return; // already have text
      if (requested.current.has(lens)) return; // already requested
      requested.current.add(lens);

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
      } catch (err) {
        console.error("generate lens failed:", err);
        // allow retry by removing from requested on failure
        requested.current.delete(lens);
      } finally {
        setLoadingLens(null);
      }
    },
    [current, byId]
  );

  // Kick off generation logic:
  // - In "all": when you land on a lens card that has no text, generate it once.
  // - In single-lens: generate that lens if missing.
  useEffect(() => {
    if (!current) return;
    if (filterPrompt === "all") {
      const activeCard = displayCards[idx];
      if (activeCard && activeCard.key !== "original" && !activeCard.hasText) {
        void generateLens(activeCard.key as TimelineId);
      }
    } else if (ORDERED_LENSES.includes(filterPrompt)) {
      // single lens mode
      const t = byId.get(filterPrompt);
      if (!t) void generateLens(filterPrompt);
    }
  }, [current, filterPrompt, idx, displayCards, generateLens, byId]);

  // when filter changes, reset index and clear in-flight request memory
  useEffect(() => {
    setIdx(0);
    requested.current.clear();
  }, [filterPrompt]);

  // navigation — wrap around
  const goNext = () => {
    const n = displayCards.length || 1;
    setIdx((i) => ((i + 1) % n + n) % n);
  };
  const goPrev = () => {
    const n = displayCards.length || 1;
    setIdx((i) => ((i - 1) % n + n) % n);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const canInteract =
    !!active &&
    (active as any).hasText !== false && // block when lens is still generating
    !(loadingLens && active?.key === loadingLens);

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
        <div>
          {displayCards.length > 0 ? `${Math.min(idx + 1, displayCards.length)} / ${displayCards.length}` : "1 / 1"}
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
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            disabled={!canInteract}
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
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            disabled={!canInteract}
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
          disabled={!canInteract || replyDraft.trim().length === 0}
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
