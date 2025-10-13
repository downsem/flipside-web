"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { postFeedback } from "@/lib/feedback";
import type { TimelineId } from "@/theme/timelines";

// --- Types the deck expects ---
type Candidate = { candidate_id: string; text: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

type Props = {
  /** The flips to render (required for production; empty array => empty state). */
  initialFlips?: Flip[];

  /**
   * Optional: explicit order to map each flip -> theme. If omitted, we use a safe default.
   * Index 0 of this array is used for the first non-original flip, index 1 for the second, etc.
   */
  timelineOrder?: TimelineId[];

  /** Optional UI copy overrides */
  copy?: {
    endTitle?: string;
    endHint?: string;
    doneButton?: string;
    revisitButton?: string;
    originalLabel?: string;
    throughThisLens?: string;
    originalBtn?: string;        // “Original”
    returnToFlipBtn?: string;    // “Return to flip”
    progressPrefix?: string;     // e.g. “Flip”
  };
};

// Safe default if you don’t pass timelineOrder
const DEFAULT_ORDER: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"] as const;

/** Small helper to clamp */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function SwipeDeck({
  initialFlips = [],
  timelineOrder = DEFAULT_ORDER,
  copy,
}: Props) {
  const { timelineId, theme, setTimeline } = useTheme();

  const [flips, setFlips] = useState<Flip[]>(Array.isArray(initialFlips) ? initialFlips : []);
  const [idx, setIdx] = useState(0);                       // which flip index we’re on (0..n-1)
  const [showOriginal, setShowOriginal] = useState(true);  // “Original” view toggle for current card
  const [lastNonOriginalIdx, setLastNonOriginalIdx] = useState<number | null>(null);
  const [showEndCard, setShowEndCard] = useState(false);   // “You’ve seen all perspectives”
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ----- Theme sync -----
  useEffect(() => {
    if (showOriginal) {
      // Neutral look: pick something soft; your “calm” palette works well as neutral
      // If you have an explicit neutral in future, set it here instead.
      setTimeline("calm");
    } else {
      const id = timelineOrder[clamp(idx, 0, timelineOrder.length - 1)];
      setTimeline(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOriginal, idx, timelineOrder.join("|")]);

  // ----- SFX/Haptics helpers -----
  const ensureSound = () => {
    if (!theme?.sound?.src) return null;
    if (!audioRef.current) {
      const a = new Audio(theme.sound.src);
      a.volume = theme.sound.volume ?? 0.25;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const haptic = (pattern?: number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator && pattern?.length) {
      navigator.vibrate(pattern);
    }
  };

  // ----- Voting -----
  const handleVote = async (
    currentFlip: Flip,
    chosen: { candidate_id: string; text: string },
    signal: 1 | -1
  ) => {
    haptic(theme?.haptics?.pattern);
    ensureSound()?.play().catch(() => {});

    // visual flourish
    triggerSwipeEffect(theme?.motion?.swipeRightEffect);

    // Report vote
    void postFeedback({
      flip_id: currentFlip.flip_id,
      candidate_id: chosen.candidate_id,
      signal,
      timeline_id: timelineId,
      seen_ms: 1800,
      context: { device: "web" },
    });

    // After voting the currently visible “flip layer”, we advance:
    // - If user was on Original, keep same idx but hide Original (go to themed view).
    // - If user was on a themed flip:
    //   -> if more remain, go to next;
    //   -> else show the end card.
    if (showOriginal) {
      setShowOriginal(false);
      setLastNonOriginalIdx(0);
    } else {
      if (idx < flips.length - 1) {
        setIdx((n) => n + 1);
        setLastNonOriginalIdx((n) => (n === null ? 0 : Math.max(n, idx + 1)));
      } else {
        setShowEndCard(true);
      }
    }
  };

  // Vote on the current layer (Original vs themed)
  const voteCurrent = (dir: "up" | "down") => {
    const current = flips[idx];
    if (!current) return;
    if (showOriginal) {
      // pseudo id for original layer
      return handleVote(current, { candidate_id: "original", text: current.original }, dir === "up" ? 1 : -1);
    }
    const candidate = current.candidates?.[0];
    if (!candidate) return;
    return handleVote(current, candidate, dir === "up" ? 1 : -1);
  };

  // ----- Navigation (tap/back/next + end-card actions) -----
  const goNext = () => {
    if (showOriginal) {
      setShowOriginal(false);
      setLastNonOriginalIdx(0);
      return;
    }
    if (idx < flips.length - 1) {
      setIdx((n) => n + 1);
      setLastNonOriginalIdx((n) => (n === null ? 0 : Math.max(n, idx + 1)));
    } else {
      setShowEndCard(true);
    }
  };

  const goPrev = () => {
    if (!showOriginal) {
      if (lastNonOriginalIdx !== null) {
        // If we’ve visited some themed flips, allow stepping backward over them
        if (idx > 0) {
          setIdx((n) => n - 1);
        } else {
          // back to Original
          setShowOriginal(true);
        }
      } else {
        // we were on the first visit of the first themed flip -> go back to Original
        setShowOriginal(true);
      }
      return;
    }
    // Already on Original -> no-op
  };

  const onTapLeft = () => {
    // Tap left = go backward (review mode)
    if (showEndCard) {
      // Coming from end-card, “Revisit flips” is a button; no tap-left action here.
      return;
    }
    goPrev();
  };

  const onTapRight = () => {
    // Tap right = go forward (advance through content)
    if (showEndCard) return;
    goNext();
  };

  const onRevisit = () => {
    // From end-card back to the last non-original flip (or last flip)
    setShowEndCard(false);
    if (flips.length > 0) {
      const backTo = lastNonOriginalIdx ?? flips.length - 1;
      setIdx(backTo);
      setShowOriginal(false);
    }
  };

  const onDone = () => {
    // “Done reading” -> restore neutral/Original and keep the card in feed
    setShowEndCard(false);
    setShowOriginal(true);
    setIdx(0);
    setTimeline("calm");
  };

  // ----- Empty state -----
  if (!flips?.length) {
    return (
      <div className="relative min-h-[30vh] theme-surface rounded-xl p-6 grid place-items-center text-sm opacity-70">
        No cards right now.
      </div>
    );
  }

  const current = flips[idx];
  const candidate = current?.candidates?.[0] ?? null;

  // ----- UI copy (with defaults) -----
  const cpy = {
    endTitle: copy?.endTitle ?? "You’ve seen all perspectives.",
    endHint: copy?.endHint ?? "Tap left to revisit earlier flips.",
    doneButton: copy?.doneButton ?? "Done — return to feed",
    revisitButton: copy?.revisitButton ?? "Revisit flips",
    originalLabel: copy?.originalLabel ?? "Original",
    throughThisLens: copy?.throughThisLens ?? "Through this lens",
    originalBtn: copy?.originalBtn ?? "Original",
    returnToFlipBtn: copy?.returnToFlipBtn ?? "Return to flip",
    progressPrefix: copy?.progressPrefix ?? "Flip",
  };

  // ----- Progress text -----
  const progressText = useMemo(() => {
    if (showOriginal) return `${cpy.progressPrefix} 0 of ${flips.length}`;
    return `${cpy.progressPrefix} ${clamp(idx + 1, 1, flips.length)} of ${flips.length}`;
  }, [showOriginal, idx, flips.length, cpy.progressPrefix]);

  return (
    <div className="relative min-h-[70vh] overflow-hidden theme-surface rounded-xl p-2 sm:p-4">
      {/* Tap zones for forward/backward (do NOT conflict with swipe voting) */}
      {!showEndCard && (
        <>
          <button
            aria-label="Previous"
            onClick={onTapLeft}
            className="absolute left-0 top-0 h-full w-1/3 z-10 bg-transparent"
          />
          <button
            aria-label="Next"
            onClick={onTapRight}
            className="absolute right-0 top-0 h-full w-1/3 z-10 bg-transparent"
          />
        </>
      )}

      {/* Top bar: progress + Original/Return toggle */}
      <div className="flex items-center justify-between px-3 sm:px-4 pt-3 pb-2 text-xs opacity-70">
        <div>{progressText}</div>
        {!showEndCard && (
          <button
            className="px-2 py-1 rounded-md border border-black/10 bg-white/50"
            onClick={() => {
              if (showOriginal && (lastNonOriginalIdx ?? -1) >= 0) {
                setShowOriginal(false);
                setIdx(lastNonOriginalIdx ?? 0);
              } else if (showOriginal) {
                // first time toggle to first flip
                setShowOriginal(false);
              } else {
                // Return to original (remember where to jump back)
                setLastNonOriginalIdx(idx);
                setShowOriginal(true);
              }
            }}
          >
            {showOriginal ? cpy.originalBtn : cpy.returnToFlipBtn}
          </button>
        )}
      </div>

      {/* End-of-stack card */}
      {showEndCard ? (
        <div className="relative m-3 sm:m-4 rounded-xl shadow-lg bg-white text-neutral-900 border-2 border-black/5 p-6 grid gap-4 place-items-center">
          <div className="text-lg font-medium">{cpy.endTitle}</div>
          <div className="text-sm opacity-70">{cpy.endHint}</div>
          <div className="flex gap-2">
            <button
              onClick={onRevisit}
              className="px-3 py-2 rounded-md border border-black/10 bg-white hover:bg-black/5"
            >
              {cpy.revisitButton}
            </button>
            <button
              onClick={onDone}
              className="px-3 py-2 rounded-md button-accent"
            >
              {cpy.doneButton}
            </button>
          </div>
        </div>
      ) : (
        // Active card layer
        current && (
          <motion.div
            key={`${current.flip_id}-${showOriginal ? "original" : "flip"}`}
            className="relative m-3 sm:m-4 rounded-xl shadow-lg border-2"
            style={{
              background: showOriginal ? "#fff" : "#fff",
              color: "#111",
              borderColor: showOriginal ? "rgba(0,0,0,.06)" : theme.colors.accent,
            }}
            initial={theme.motion.enter}
            animate={theme.motion.animate}
            // If theme.motion.transition is a loose shape, cast it to any to satisfy TS
            transition={(theme.motion.transition as any) ?? undefined}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              const x = info.offset.x;
              if (x > 120) voteCurrent("up");
              else if (x < -120) voteCurrent("down");
            }}
          >
            <div className="p-5 sm:p-6 space-y-3">
              <div className="text-xs opacity-70">
                {showOriginal ? (
                  <>Neutral • ORIGINAL</>
                ) : (
                  <>
                    {theme.icon} {theme.label} • {timelineId.toUpperCase()}
                  </>
                )}
              </div>

              {/* ORIGINAL layer */}
              {showOriginal ? (
                <>
                  <div className="text-sm opacity-70">{cpy.originalLabel}</div>
                  <p className="text-base leading-6">{current.original}</p>
                </>
              ) : (
                // THEMED candidate layer
                <>
                  <div className="text-sm opacity-70">{cpy.throughThisLens}</div>
                  <p className="text-lg leading-7">{candidate?.text ?? "…"}</p>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  className="px-3 py-2 rounded-md border border-black/10"
                  onClick={() => voteCurrent("down")}
                >
                  👎
                </button>
                <button
                  className="px-3 py-2 rounded-md button-accent"
                  onClick={() => voteCurrent("up")}
                >
                  👍
                </button>
              </div>
            </div>
          </motion.div>
        )
      )}

      <div id="swipe-effect-layer" className="pointer-events-none absolute inset-0" />
    </div>
  );
}

/** simple visual flourish on swipe */
function triggerSwipeEffect(effect?: string) {
  const layer = document.getElementById("swipe-effect-layer");
  if (!layer) return;

  const el = document.createElement("div");
  el.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  el.style.width = "220px";
  el.style.height = "220px";
  el.style.background = "var(--accent)";
  el.style.opacity = "0.25";
  el.style.borderRadius = effect === "burst" ? "2px" : "50%";
  el.style.transition = "transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms";
  if (effect === "burst") el.style.clipPath = "polygon(0 0, 100% 0, 80% 100%, 20% 100%)";
  if (effect === "flip") el.style.clipPath = "inset(0 round 12px)";
  layer.appendChild(el);

  requestAnimationFrame(() => {
    if (effect === "flip") {
      el.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], {
        duration: 500,
        easing: "ease-in-out",
      });
    } else if (effect === "confetti") {
      for (let i = 0; i < 14; i++) {
        const c = document.createElement("div");
        c.className = "absolute";
        c.style.width = "6px";
        c.style.height = "10px";
        c.style.background = "var(--accent)";
        c.style.left = Math.random() * 100 + "%";
        c.style.top = "50%";
        c.style.transform = "translateY(-50%)";
        c.style.opacity = "0.8";
        layer.appendChild(c);
        c.animate(
          [
            { transform: `translateY(-50%) translate(${rand(-40, 40)}px, ${rand(-10, 10)}px)` },
            {
              transform: `translateY(120%) translate(${rand(-80, 80)}px, ${rand(40, 140)}px)`,
              opacity: 0,
            },
          ],
          { duration: 700 + Math.random() * 300, easing: "ease-out" }
        ).onfinish = () => c.remove();
      }
    }
    el.style.transform = effect === "merge" ? "scale(1.4)" : "scale(1.15)";
    el.style.opacity = "0";
  });

  setTimeout(() => el.remove(), 520);
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
