// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, TIMELINE_LIST } from "@/theme/timelines";

// ----- Types coming from PostCard -----
import type { PromptKey } from "@/utils/prompts";

type VoteHandlerArgs = {
  index: number;
  key: PromptKey | "original";
  value: "up" | "down" | null;
  text: string;
};

type ReplyHandlerArgs = {
  index: number;
  key: PromptKey | "original";
  text: string;     // reply body
  flipText: string; // the flip text you’re replying to
};

type Props = {
  originalText: string;
  apiBase: string; // e.g. NEXT_PUBLIC_API_BASE
  onVote?: (args: VoteHandlerArgs) => Promise<void> | void;
  onReply?: (args: ReplyHandlerArgs) => Promise<void> | void;
};

// ----- API shape from /flips -----
type ApiFlip = { promptKind: string; text: string };

export default function SwipeDeck({
  originalText,
  apiBase,
  onVote,
  onReply,
}: Props) {
  const { timelineId, theme, setTimeline } = useTheme();

  // index 0 = Original, then the fetched flips
  const [active, setActive] = useState(0);
  const [flips, setFlips] = useState<ApiFlip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Build the list we ask the API to generate (send display labels;
  // backend also accepts ids, but labels are explicit).
  const requestedKinds = useMemo(
    () => TIMELINE_LIST.map((t) => t.label),
    []
  );

  // Fetch from API **/flips** (not /generate_flips)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setFlips(null);
      setActive(0);

      try {
        const res = await fetch(`${apiBase}/flips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText,
            promptKinds: requestedKinds, // tell the API exactly which we want
          }),
        });

        if (!res.ok) {
          const msg = await safeErr(res);
          throw new Error(msg || `API returned ${res.status}`);
        }

        const data: { flips: ApiFlip[] } = await res.json();
        if (!cancelled) setFlips(Array.isArray(data.flips) ? data.flips : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to fetch flips");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, originalText, requestedKinds]);

  // Keep theme in sync with the active card:
  // 0 = neutral/original; >0 = map to a timeline
  useEffect(() => {
    if (active === 0) {
      // return to current selected theme (or default) – do nothing special
      return;
    }
    const flip = flips?.[active - 1]; // because original is index 0
    if (!flip) return;

    // Find the timeline by either label (promptKind) or id
    const match =
      TIMELINE_LIST.find((t) => t.label === flip.promptKind) ||
      TIMELINE_LIST.find((t) => t.id === toId(flip.promptKind));

    if (match) setTimeline(match.id);
  }, [active, flips, setTimeline]);

  // Play small sound if defined on theme
  const ensureSound = () => {
    if (!theme?.sound?.src) return null;
    if (!audioRef.current) {
      const a = new Audio(theme.sound.src);
      a.volume = theme.sound.volume ?? 0.25;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const handleVote = async (
    dir: "up" | "down" | null,
    index: number,
    key: PromptKey | "original",
    text: string
  ) => {
    try {
      ensureSound()?.play().catch(() => {});
      if (onVote) await onVote({ index, key, value: dir, text });
    } catch {
      /* non-blocking */
    }
  };

  const handleReply = async (index: number, key: PromptKey | "original", text: string, flipText: string) => {
    try {
      if (onReply) await onReply({ index, key, text, flipText });
    } catch {
      /* non-blocking */
    }
  };

  // ---- Render helpers ----
  const total = 1 + (flips?.length ?? 0); // original + N flips
  const canPrev = active > 0;
  const canNext = active < total - 1;

  const goPrev = () => setActive((i) => Math.max(0, i - 1));
  const goNext = () => setActive((i) => Math.min(total - 1, i + 1));

  // Active content
  const card = useMemo(() => {
    if (active === 0) {
      return {
        title: "ORIGINAL POST",
        text: originalText,
        key: "original" as const,
        idx: -1,
        accent: theme.colors.accent,
      };
    }
    const flip = flips?.[active - 1];
    return flip
      ? {
          title: flip.promptKind,
          text: flip.text,
          key: toPromptKey(flip.promptKind),
          idx: active - 1,
          accent: theme.colors.accent,
        }
      : null;
  }, [active, flips, originalText, theme.colors.accent]);

  return (
    <div className="relative theme-surface rounded-xl p-4 overflow-hidden">
      {/* Status bar / errors */}
      {error && (
        <div className="mb-3 text-sm text-red-600">
          Error: {error}
        </div>
      )}

      {/* Card */}
      {card && (
        <motion.div
          key={`${active}-${card.key}`}
          className="rounded-xl bg-white text-neutral-900 shadow-lg p-5"
          initial={theme.motion.enter}
          animate={theme.motion.animate}
          transition={toFramerTransition(theme.motion.transition)}
          style={{ border: `2px solid ${card.accent}` }}
        >
          <div className="text-xs opacity-70 mb-2">{card.title}</div>
          <div className="whitespace-pre-wrap leading-6">{card.text}</div>

          <div className="mt-4 flex items-center gap-2">
            {/* Vote buttons */}
            <button
              className="px-3 py-2 rounded-md border border-black/10"
              onClick={() => handleVote("down", card.idx, card.key, card.text)}
              title="Downvote"
            >
              👎
            </button>
            <button
              className="px-3 py-2 rounded-md button-accent"
              onClick={() => handleVote("up", card.idx, card.key, card.text)}
              title="Upvote"
            >
              👍
            </button>

            {/* Reply (simple example) */}
            <button
              className="ml-auto px-3 py-2 rounded-md border border-black/10"
              onClick={() =>
                handleReply(
                  card.idx,
                  card.key,
                  "Thanks for the perspective.",
                  card.text
                )
              }
            >
              Reply
            </button>
          </div>

          {/* Navigation + Original toggle */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              className="px-2 py-1 rounded-md border border-black/10 disabled:opacity-40"
              onClick={goPrev}
              disabled={!canPrev}
            >
              ← Prev
            </button>

            <div className="opacity-70">
              {active + 1} / {total}
            </div>

            <button
              className="px-2 py-1 rounded-md border border-black/10 disabled:opacity-40"
              onClick={goNext}
              disabled={!canNext}
            >
              Next →
            </button>
          </div>

          {/* “Original / Return to flip” toggle */}
          <div className="mt-2">
            {active === 0 ? (
              <button
                className="text-xs underline opacity-80"
                onClick={() => setActive(1)}
                disabled={total <= 1}
              >
                View flips
              </button>
            ) : (
              <button
                className="text-xs underline opacity-80"
                onClick={() => setActive(0)}
              >
                View original (return to flip)
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Nothing returned from API */}
      {!error && flips && flips.length === 0 && (
        <div className="text-sm opacity-70 p-6 text-center">
          Nothing to show yet.
        </div>
      )}

      <div id="swipe-effect-layer" className="pointer-events-none absolute inset-0" />
    </div>
  );
}

/* ---------------- helpers ---------------- */

function toId(labelOrId: string) {
  // normalize label → our timeline id (rough guess)
  const lower = labelOrId.toLowerCase();
  if (lower.includes("calm")) return "calm";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("cynic")) return "cynical";
  if (lower.includes("opposite")) return "opposite";
  if (lower.includes("playful")) return "playful";
  return labelOrId as keyof typeof TIMELINES;
}

function toPromptKey(label: string): PromptKey | "original" {
  // If your PromptKey type expects specific keys, map here.
  // For now we just return the label as-is (caller stores it).
  return label as PromptKey;
}

async function safeErr(res: Response) {
  try {
    const j = await res.json();
    return j?.detail || j?.error || "";
  } catch {
    return "";
  }
}

function toFramerTransition(input?: {
  type?: string;
  stiffness?: number;
  damping?: number;
  duration?: number;
}) {
  // Framer’s TS types want `type` to be a known literal; fall back safely.
  if (!input) return undefined;
  const { type, stiffness, damping, duration } = input;
  const t =
    type === "spring" || type === "tween" || type === "inertia"
      ? type
      : undefined;
  return { type: t, stiffness, damping, duration };
}
