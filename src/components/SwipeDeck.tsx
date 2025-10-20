// src/components/SwipeDeck.tsx
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TIMELINE_LIST, getTimeline, type TimelineId } from "@/theme/timelines";
import { useFeedFilter } from "./FeedFilterContext";
import { postFeedback } from "@/lib/feedback";
import type { PromptKey } from "@/utils/prompts";

// ---- Types (unchanged) ----
type Candidate = { candidate_id: string; text: string };
type OneFlip = { flip_id: string; original: string; candidates: Candidate[] };

type Props = {
  // If no API fetching, parent can still pass seeded flips
  initialFlips?: OneFlip[];
  // Or pass the original text + we’ll call the API to get flips
  originalText?: string;
  apiBase?: string;
  onVote?: (args: {
    index: number;
    key: PromptKey | "original";
    value: "up" | "down" | null;
    text: string;
  }) => Promise<void> | void;
  onReply?: (args: {
    index: number;
    key: PromptKey | "original";
    text: string;
    flipText: string;
  }) => Promise<void> | void;
};

const NEUTRAL_BG = "#E7F2F9";

export default function SwipeDeck({
  initialFlips,
  originalText,
  apiBase,
  onVote,
  onReply,
}: Props) {
  const { filter } = useFeedFilter();

  // ---- Demo / data glue (unchanged logic) ----
  const [flips, setFlips] = useState<OneFlip[]>(
    initialFlips ??
      [
        {
          flip_id: "demo-1",
          original:
            "If Republicans want to blame their shutdown on me, they are more than welcome to come to my office and negotiate anytime.\n\nUnlike them, I won’t let kids and hard working people get cut off their insulin and chemo on my watch.\n\nThey know it, too. Door’s open fellas. Your call.",
          candidates: [],
        },
      ]
  );

  // If an API is provided and we have originalText, fetch flips (only on mount)
  useEffect(() => {
    let ignore = false;
    async function go() {
      if (!apiBase || !originalText) return;
      try {
        const res = await fetch(`${apiBase.replace(/\/$/, "")}/flips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText,
            promptKinds: ["calm", "bridge", "cynical", "opposite", "playful"], // backend maps ids
          }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (ignore) return;

        const candidates: Candidate[] = (data.flips || []).map((f: any, i: number) => ({
          candidate_id: `c${i + 1}`,
          text: f.text,
        }));
        setFlips([
          {
            flip_id: `api-${Date.now()}`,
            original: originalText,
            candidates,
          },
        ]);
      } catch (e) {
        console.warn("generate flips failed:", e);
      }
    }
    go();
    return () => {
      ignore = true;
    };
  }, [apiBase, originalText]);

  // ---- Which “view” to show based on filter ----
  // null => Default(All) => show Original + all lenses
  // lens => only that lens (no Original, no swiping across others)
  const [cursor, setCursor] = useState(0);

  // flatten all candidates across flips (MVP feed shows one flip at a time anyway)
  const active = flips[0];

  // compute the list for the current mode
  const displayItems = useMemo(() => {
    if (!active) return [];

    const all = [
      { kind: "original" as const, text: active.original, timelineId: null as TimelineId | null },
      ...TIMELINE_LIST.map((t, i) => ({
        kind: t.id as TimelineId,
        text: active.candidates[i]?.text ?? "",
        timelineId: t.id,
      })),
    ];

    if (filter === null) {
      // Default: Original then every lens
      return all;
    } else {
      // Specific lens only
      const idx = TIMELINE_LIST.findIndex((t) => t.id === filter);
      const text = active.candidates[idx]?.text ?? "";
      return [{ kind: filter, text, timelineId: filter }];
    }
  }, [active, filter]);

  // keep cursor in range if the list shape changes
  useEffect(() => {
    setCursor(0);
  }, [filter, active?.flip_id]);

  const current = displayItems[cursor];

  // ---- Voting / feedback ----
  const sendVote = useCallback(
    async (dir: "up" | "down") => {
      if (!active || !current) return;
      const isOriginal = current.kind === "original";
      try {
        await onVote?.({
          index: isOriginal ? -1 : cursor - 1,
          key: isOriginal ? "original" : (current.kind as PromptKey),
          value: dir,
          text: current.text,
        });
        // lightweight sink (non-blocking)
        postFeedback({
          flip_id: active.flip_id,
          candidate_id: isOriginal ? "original" : `c${cursor}`,
          signal: dir === "up" ? 1 : -1,
          timeline_id: isOriginal ? "original" : (current.kind as TimelineId),
        }).catch(() => {});
      } catch {
        /* noop */
      }
    },
    [active, current, cursor, onVote]
  );

  const sendReply = useCallback(
    async (reply: string) => {
      if (!active || !current) return;
      const isOriginal = current.kind === "original";
      await onReply?.({
        index: isOriginal ? -1 : cursor - 1,
        key: isOriginal ? "original" : (current.kind as PromptKey),
        text: reply,
        flipText: current.text,
      });
    },
    [active, current, cursor, onReply]
  );

  // ---- UI theme per lens (or neutral for Original / default bg) ----
  const bg = current?.timelineId ? getTimeline(current.timelineId).colors.bg : NEUTRAL_BG;

  // ---- Render ----
  return (
    <div className="tap-transparent" style={{ background: bg }}>
      {/* Single clean card — no stacked shadows */}
      <div className="rounded-3xl bg-white shadow-lg ring-1 ring-black/5 p-4 sm:p-6">
        {/* Top nav for prev/next only when unfiltered */}
        {filter === null && (
          <div className="flex items-center justify-between mb-3">
            <button
              className="rounded-xl border px-3 py-1 text-sm disabled:opacity-40"
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
              disabled={cursor === 0}
            >
              ← Prev
            </button>
            <button
              className="rounded-xl border px-3 py-1 text-sm disabled:opacity-40"
              onClick={() => setCursor((c) => Math.min(displayItems.length - 1, c + 1))}
              disabled={cursor >= displayItems.length - 1}
            >
              Next →
            </button>
          </div>
        )}

        {/* Text */}
        <div className="whitespace-pre-wrap leading-relaxed text-[17px] sm:text-[18px]">
          {current?.text || ""}
        </div>

        {/* Vote row */}
        <div className="mt-4 flex gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-lg hover:bg-gray-50"
            onClick={() => sendVote("down")}
            aria-label="Downvote"
          >
            👎
          </button>
          <button
            className="rounded-xl border px-3 py-2 text-lg hover:bg-gray-50"
            onClick={() => sendVote("up")}
            aria-label="Upvote"
          >
            👍
          </button>
        </div>

        {/* Reply box (single comment input for MVP) */}
        <ReplyBox
          disabled={!current}
          onSubmit={async (val) => {
            await sendReply(val);
          }}
        />
      </div>
    </div>
  );
}

function ReplyBox({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const [val, setVal] = useState("");

  return (
    <div className="mt-4">
      <textarea
        className="w-full rounded-2xl border px-3 py-2 min-h-[96px]"
        placeholder="Write a reply..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={disabled}
      />
      <div className="mt-2 flex justify-end">
        <button
          className="rounded-2xl bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={async () => {
            if (!val.trim()) return;
            await onSubmit(val.trim());
            setVal("");
          }}
          disabled={disabled}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
