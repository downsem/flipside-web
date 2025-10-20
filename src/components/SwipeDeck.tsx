// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { postFeedback } from "@/lib/feedback";
import type { TimelineId } from "@/theme/timelines";

type Candidate = { candidate_id: string; text: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };
type FilterKind = "all" | TimelineId;

type Props = {
  initialFlips?: Flip[];
  apiBase: string;
  filterPrompt: FilterKind; // <- NEW
  onVote?: (args: {
    index: number;
    key: "original" | string;
    value: "up" | "down" | null;
    text: string;
  }) => Promise<void> | void;
  onReply?: (args: {
    index: number;
    key: "original" | string;
    text: string;
    flipText: string;
  }) => Promise<void> | void;
};

const ORDER: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

export default function SwipeDeck({
  initialFlips = [],
  apiBase,
  filterPrompt,
  onVote,
  onReply,
}: Props) {
  const { timelineId, theme } = useTheme();
  const [flips, setFlips] = useState<Flip[]>(
    Array.isArray(initialFlips) ? initialFlips : []
  );

  // we only render ONE card (the current) to avoid the stacked look
  const [currentIdx, setCurrentIdx] = useState(0);

  // Did we generate flips for this post yet?
  const [generated, setGenerated] = useState(false);
  const topFlip = flips[currentIdx];

  // Generate on demand:
  // - if filter = "all": generate all lenses (ORDER)
  // - if filter = specific id: generate only that one lens
  useEffect(() => {
    // nothing to generate without an original
    const base = flips[0];
    if (!base?.original) return;

    // already generated?
    if (generated) return;

    const go = async () => {
      try {
        const kinds =
          filterPrompt === "all" ? ORDER : [filterPrompt as TimelineId];

        const resp = await fetch(`${apiBase}/flips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText: base.original,
            promptKinds: kinds,
          }),
        });
        if (!resp.ok) throw new Error(`flips failed: ${resp.status}`);
        const data = await resp.json();

        // shape into our local Flip structure (single post)
        const created: Candidate[] = (data.flips || []).map(
          (f: { promptKind: string; text: string }, i: number) => ({
            candidate_id: `${i}`,
            text: f.text || "",
          })
        );

        setFlips([
          {
            flip_id: base.flip_id,
            original: base.original,
            candidates: created,
          },
        ]);
        setGenerated(true);

        // If filter = specific prompt → skip original and show the one generated candidate.
        if (filterPrompt !== "all") {
          setCurrentIdx(0); // we still have a single Flip object; the card shows candidate[0]
        }
      } catch (e) {
        console.error("generate error", e);
      }
    };

    go();
  }, [apiBase, flips, generated, filterPrompt]);

  // Card view model
  const showingOriginal =
    filterPrompt === "all" && currentIdx === 0 && (flips[0]?.candidates?.length ?? 0) >= 0;

  // Readable text displayed on the card
  const displayText = useMemo(() => {
    const f = flips[0];
    if (!f) return "";
    if (filterPrompt === "all") {
      // original first, then candidate N (we model it as still index 0 flip)
      const step = currentIdx;
      if (step === 0) return f.original;
      return f.candidates[step - 1]?.text ?? "";
    }
    // specific lens: just show candidate[0]
    return f.candidates[0]?.text ?? "";
  }, [flips, currentIdx, filterPrompt]);

  // How many steps are there?
  const totalSteps =
    filterPrompt === "all"
      ? 1 + (flips[0]?.candidates?.length ?? 0) // original + N candidates
      : Math.min(1, (flips[0]?.candidates?.length ?? 0)); // exactly 1

  const canPrev = filterPrompt === "all" ? currentIdx > 0 : false;
  const canNext = currentIdx < totalSteps - 1;

  // vote handler (kept simple)
  const emitVote = async (dir: 1 | -1) => {
    const key =
      filterPrompt === "all"
        ? currentIdx === 0
          ? "original"
          : ORDER[currentIdx - 1]
        : (filterPrompt as TimelineId);

    const text = displayText;
    try {
      await onVote?.({
        index: currentIdx,
        key,
        value: dir === 1 ? "up" : "down",
        text,
      });
      // send feedback ping to your web API if you want
      void postFeedback({
        flip_id: flips[0]?.flip_id ?? "unknown",
        candidate_id: `${currentIdx}`,
        signal: dir,
        timeline_id: key === "original" ? "original" : String(key),
        seen_ms: 1500,
        context: { device: "web" },
      });
    } catch (e) {
      console.warn("vote error", e);
    }
  };

  // Reply handler (MVP demo)
  const [replyText, setReplyText] = useState("");
  const submitReply = async () => {
    const key =
      filterPrompt === "all"
        ? currentIdx === 0
          ? "original"
          : ORDER[currentIdx - 1]
        : (filterPrompt as TimelineId);

    const flipText = displayText;
    try {
      await onReply?.({
        index: currentIdx,
        key,
        text: replyText,
        flipText,
      });
      setReplyText("");
      alert("Thanks for the comment!");
    } catch (e) {
      console.warn("reply error", e);
    }
  };

  // Empty state
  if (!flips[0]) {
    return (
      <div className="rounded-xl p-6 text-sm opacity-70 border">
        No content.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Single card */}
      <motion.div
        className="rounded-xl border shadow-sm bg-white"
        initial={theme.motion.enter}
        animate={theme.motion.animate}
        transition={theme.motion.transition as any}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          const x = info.offset.x;
          if (x > 120 && canNext) setCurrentIdx((i) => i + 1);
          else if (x < -120 && canPrev) setCurrentIdx((i) => i - 1);
        }}
      >
        <div className="p-5 space-y-4">
          {/* (No icon/category per your request) */}

          {/* Body text */}
          <p className="text-base leading-6 whitespace-pre-wrap">{displayText}</p>

          {/* Vote + Nav */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-md border"
                onClick={() => emitVote(-1)}
                aria-label="Downvote"
              >
                👎
              </button>
              <button
                className="px-3 py-2 rounded-md border"
                onClick={() => emitVote(1)}
                aria-label="Upvote"
              >
                👍
              </button>
            </div>

            {/* Prev/Next (auto-hidden on small screens via CSS) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-md border disabled:opacity-40"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={!canPrev}
                aria-label="Previous"
              >
                Prev
              </button>
              <button
                className="px-3 py-2 rounded-md border disabled:opacity-40"
                onClick={() =>
                  setCurrentIdx((i) => Math.min(totalSteps - 1, i + 1))
                }
                disabled={!canNext}
                aria-label="Next"
              >
                Next
              </button>
            </div>
          </div>

          {/* Reply box (MVP) */}
          <div className="pt-2 space-y-2">
            <textarea
              className="w-full rounded-lg border p-2 text-sm"
              placeholder="Write a quick comment…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button
              className="px-3 py-2 rounded-md border"
              onClick={submitReply}
              disabled={replyText.trim().length === 0}
            >
              Reply
            </button>
          </div>
        </div>
      </motion.div>

      {/* When at the end and a specific filter is on, show “Nothing else to see” */}
      {filterPrompt !== "all" && !canNext && (
        <div className="text-center text-sm opacity-70 mt-3">
          Nothing else to see in this lens.
        </div>
      )}
    </div>
  );
}
