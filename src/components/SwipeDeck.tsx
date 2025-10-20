"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Transition } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, type TimelineId, type TimelineSpec } from "@/theme/timelines";
import { postFeedback } from "@/lib/feedback";

type Candidate = { candidate_id: string; text: string; promptKind?: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

type VoteValue = "up" | "down" | null;

type Props = {
  initialFlips?: Flip[];
  apiBase: string;
  filterPrompt: TimelineId | null;

  onVote?: (args: {
    index: number;
    key: TimelineId | "original";
    value: VoteValue;
    text: string;
  }) => Promise<void>;

  onReply?: (args: {
    index: number;
    key: TimelineId | "original";
    text: string;      // user reply
    flipText: string;  // the text being replied to
  }) => Promise<void>;

  replyDraft?: string;
  setReplyDraft?: (v: string) => void;
};

export default function SwipeDeck({
  initialFlips = [],
  apiBase,
  filterPrompt,
  onVote,
  onReply,
  replyDraft,
  setReplyDraft,
}: Props) {
  const { timelineId, theme, setTimeline } = useTheme();
  const [flips, setFlips] = useState<Flip[]>(initialFlips);
  const [cardIndex, setCardIndex] = useState(0); // 0 = original (when not filtered)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ---- Derive the visible "promptKey" for theming/UI rules
  const visibleKey: TimelineId | "original" | null = useMemo(() => {
    if (filterPrompt) return filterPrompt;               // filtered → only that prompt
    return cardIndex === 0 ? "original" : sequenceOrder[cardIndex - 1] ?? null;
  }, [filterPrompt, cardIndex]);

  // ---- Apply theme based on visibleKey (original = neutral: keep current theme’s bg/text)
  useEffect(() => {
    if (!visibleKey || visibleKey === "original") return;
    setTimeline(visibleKey);
  }, [visibleKey, setTimeline]);

  // ---- Fetch/generate flips when needed
  useEffect(() => {
    const f = flips[0];
    if (!f) return;

    // If the first candidate is empty, we need to fetch/generate them
    const needGen = f.candidates.some((c) => !c.text);
    if (!needGen) return;

    const kinds: TimelineId[] = (filterPrompt
      ? [filterPrompt]
      : sequenceOrder) as TimelineId[];

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${apiBase}/flips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText: f.original,
            promptKinds: kinds,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`flips API ${res.status}`);
        const data = await res.json();

        // Map backend labels → our ids (we aligned these already, but be safe)
        // We expect backend promptKind labels to be the TIMELINES labels; find by label.
        const labelToId = new Map<string, TimelineId>(
          Object.values(TIMELINES).map((t) => [t.label, t.id])
        );

        const filled = kinds.map((id) => {
          const label = TIMELINES[id].label;
          const hit = data.flips.find((x: any) => x.promptKind === label) || data.flips.find((x: any) => x.promptKind === id);
          return {
            candidate_id: `${f.flip_id}-${id}-c0`,
            text: hit?.text || "",
            promptKind: id,
          } as Candidate;
        });

        setFlips([{ ...f, candidates: filled }]);
      } catch (e) {
        console.warn("flips fetch failed", e);
      }
    })();

    return () => controller.abort();
  }, [apiBase, filterPrompt, flips]);

  const current = flips[0];
  const isFiltered = !!filterPrompt;

  // Build the sequence order for unfiltered mode (original first, then prompts)
  const seq = useMemo(() => {
    if (isFiltered) return ["only"]; // single view
    return ["original", ...sequenceOrder] as const;
  }, [isFiltered]);

  const atStart = cardIndex === 0;
  const atEnd = cardIndex >= seq.length - 1;

  // Sound/haptics helpers
  const ensureSound = () => {
    if (!theme?.sound?.src) return null;
    if (!audioRef.current) {
      const a = new Audio(theme.sound.src);
      a.volume = theme.sound.volume ?? 0.25;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const triggerEffect = (effect?: TimelineSpec["motion"]["swipeRightEffect"]) => {
    const layer = document.getElementById("swipe-effect-layer");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    el.style.width = "220px";
    el.style.height = "220px";
    el.style.background = "var(--accent)";
    el.style.opacity = "0.22";
    el.style.borderRadius = effect === "burst" ? "2px" : "50%";
    el.style.transition = "transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms";
    if (effect === "burst") el.style.clipPath = "polygon(0 0, 100% 0, 80% 100%, 20% 100%)";
    layer.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = effect === "merge" ? "scale(1.4)" : "scale(1.15)";
      el.style.opacity = "0";
    });
    setTimeout(() => el.remove(), 520);
  };

  const doVote = async (dir: 1 | -1) => {
    const key: TimelineId | "original" =
      isFiltered ? (filterPrompt as TimelineId) :
      cardIndex === 0 ? "original" : sequenceOrder[cardIndex - 1];

    const flipText =
      key === "original"
        ? current?.original ?? ""
        : current?.candidates.find((c) => c.promptKind === key)?.text ?? "";

    // haptics + sfx
    if (typeof navigator !== "undefined" && "vibrate" in navigator && theme?.haptics?.pattern) {
      navigator.vibrate(theme.haptics.pattern);
    }
    ensureSound()?.play().catch(() => {});
    triggerEffect(TIMELINES[key === "original" ? timelineId : key].motion.swipeRightEffect);

    // feedback sink
    void postFeedback({
      flip_id: current?.flip_id || "unknown",
      candidate_id: key === "original" ? "original" : `${current?.flip_id}-${key}-c0`,
      signal: dir,
      timeline_id: key === "original" ? "neutral" : key,
      seen_ms: 1400,
      context: { device: "web" },
    });

    await onVote?.({
      index: cardIndex,
      key,
      value: dir > 0 ? "up" : "down",
      text: flipText,
    });

    // advance only if unfiltered; if filtered, show “done”
    if (!isFiltered && !atEnd) setCardIndex((i) => i + 1);
  };

  const next = () => {
    if (!isFiltered && !atEnd) setCardIndex((i) => i + 1);
  };
  const prev = () => {
    if (!isFiltered && !atStart) setCardIndex((i) => i - 1);
  };

  // Determine what text to show
  const visibleText = useMemo(() => {
    if (!current) return "";
    if (isFiltered) {
      const id = filterPrompt!;
      return current.candidates.find((c) => c.promptKind === id)?.text || "";
    }
    if (cardIndex === 0) return current.original;
    const id = sequenceOrder[cardIndex - 1];
    return current.candidates.find((c) => c.promptKind === id)?.text || "";
  }, [current, isFiltered, filterPrompt, cardIndex]);

  if (!current) {
    return (
      <div className="relative min-h-[30vh] theme-surface rounded-xl p-6 grid place-items-center text-sm opacity-70">
        No cards right now.
      </div>
    );
  }

  const transition: Transition = { type: "spring", stiffness: 70, damping: 16 };

  const showDone = isFiltered || atEnd;

  return (
    <div className="relative theme-surface rounded-xl p-4">
      {/* Card */}
      <motion.div
        className="relative rounded-xl shadow-lg border border-black/5 bg-white"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition}
      >
        <div className="p-5 space-y-4">
          {/* Top control row: Prev/Next (desktop only) */}
          {!isFiltered && (
            <div className="hidden md:flex items-center justify-between">
              <button
                onClick={prev}
                disabled={atStart}
                className="px-2 py-1 text-sm rounded-md border border-black/10 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={next}
                disabled={atEnd}
                className="px-2 py-1 text-sm rounded-md border border-black/10 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}

          {/* The text (no icon/category line) */}
          <div className="text-base leading-6 whitespace-pre-wrap">
            {visibleText || <span className="opacity-60">Loading…</span>}
          </div>

          {/* Vote + Reply */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-md border border-black/10"
                onClick={() => doVote(-1)}
              >
                👎
              </button>
              <button
                className="px-3 py-2 rounded-md button-accent"
                onClick={() => doVote(+1)}
              >
                👍
              </button>
            </div>

            {/* Simple single reply box for the visible flip */}
            {setReplyDraft && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const key: TimelineId | "original" =
                    isFiltered ? (filterPrompt as TimelineId) :
                    cardIndex === 0 ? "original" : sequenceOrder[cardIndex - 1];

                  const flipText =
                    key === "original"
                      ? current?.original ?? ""
                      : current?.candidates.find((c) => c.promptKind === key)?.text ?? "";

                  await onReply?.({
                    index: cardIndex,
                    key,
                    text: replyDraft ?? "",
                    flipText,
                  });
                }}
                className="flex flex-col gap-2"
              >
                <textarea
                  value={replyDraft ?? ""}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write a reply…"
                  className="w-full rounded-md border border-black/10 p-2 text-sm"
                  rows={3}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-md bg-[var(--accent)] text-[var(--text)]/90"
                    disabled={!replyDraft}
                  >
                    Reply
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* “Done” notice while filtered or at end */}
          {showDone && (
            <div className="text-center text-sm opacity-70 pt-2">
              That’s all to see here.
            </div>
          )}
        </div>
      </motion.div>

      {/* Effect layer */}
      <div id="swipe-effect-layer" className="pointer-events-none absolute inset-0" />
    </div>
  );
}

// Unfiltered sequence:
const sequenceOrder: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];
