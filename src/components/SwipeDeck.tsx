"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { postFeedback } from "@/lib/feedback";

type Candidate = { candidate_id: string; text: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

type Props = {
  /** Optional. If omitted, the deck renders an empty state instead of crashing. */
  initialFlips?: Flip[];
};

export default function SwipeDeck({ initialFlips = [] }: Props) {
  const { timelineId, theme } = useTheme();

  const [flips, setFlips] = useState<Flip[]>(
    Array.isArray(initialFlips) ? initialFlips : []
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Safe defaults in case theme pieces are missing
  const motionEnter = theme?.motion?.enter ?? { opacity: 0, scale: 0.98 };
  const motionAnimate = theme?.motion?.animate ?? { opacity: 1, scale: 1 };
  const motionTransition =
    theme?.motion?.transition ?? { type: "spring", stiffness: 60, damping: 14 };
  const swipeEffect = theme?.motion?.swipeRightEffect;

  const accent = theme?.colors?.accent ?? "#e5e7eb"; // fallback border color

  const ensureSound = () => {
    if (!theme?.sound?.src) return null;
    if (!audioRef.current) {
      const a = new Audio(theme.sound.src);
      a.volume = theme.sound.volume ?? 0.25;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const handleVote = async (flip: Flip, chosen: Candidate, signal: 1 | -1) => {
    // haptics
    if (
      typeof navigator !== "undefined" &&
      "vibrate" in navigator &&
      theme?.haptics?.pattern
    ) {
      navigator.vibrate(theme.haptics.pattern);
    }

    // sound
    const a = ensureSound();
    a?.play().catch(() => {});

    // visual effect
    triggerSwipeEffect(swipeEffect);

    // feedback
    void postFeedback({
      flip_id: flip.flip_id,
      candidate_id: chosen.candidate_id,
      signal,
      timeline_id: timelineId,
      seen_ms: 1800,
      context: { device: "web" },
    });

    // remove card
    setFlips((prev) => prev.filter((f) => f.flip_id !== flip.flip_id));
  };

  // Empty state
  if (!flips || flips.length === 0) {
    return (
      <div className="relative min-h-[30vh] theme-surface rounded-xl p-6 grid place-items-center text-sm opacity-70">
        No cards right now.
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh] overflow-hidden theme-surface rounded-xl p-4 touch-pan-y overscroll-contain tap-transparent">
      {flips.map((flip, idx) => {
        const isTop = idx === 0;
        const candidate = flip.candidates?.[0];
        if (!candidate) return null;

        return (
          <motion.div
            key={flip.flip_id}
            className="absolute inset-0 m-4 rounded-xl shadow-lg outline-none"
            style={{
              background: "#fff",
              color: "#111",
              border: `2px solid ${accent}`,
            }}
            initial={motionEnter}
            animate={motionAnimate}
            transition={motionTransition}
            // drag only for top card
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              const x = info.offset.x;
              if (x > 120) handleVote(flip, candidate, +1);
              else if (x < -120) handleVote(flip, candidate, -1);
            }}
            // basic keyboard a11y for the active card
            tabIndex={isTop ? 0 : -1}
            onKeyDown={(e) => {
              if (!isTop) return;
              if (e.key === "ArrowRight") handleVote(flip, candidate, +1);
              if (e.key === "ArrowLeft") handleVote(flip, candidate, -1);
            }}
            aria-label={`Swipe card ${idx + 1} of ${flips.length}`}
          >
            <div className="p-5 space-y-3">
              <div className="text-xs opacity-70">
                {theme?.icon} {theme?.label} • {timelineId?.toUpperCase?.()}
              </div>

              <div className="text-sm opacity-70">Original</div>
              <p className="text-base leading-6">{flip.original}</p>

              <hr className="my-2" />

              <div className="text-sm opacity-70">Through this lens</div>
              <p className="text-lg leading-7">{candidate.text}</p>

              <div className="flex gap-2 pt-4">
                <button
                  className="px-3 py-2 rounded-md border border-black/10"
                  onClick={() => handleVote(flip, candidate, -1)}
                  aria-label="Thumbs down"
                >
                  👎
                </button>
                <button
                  className="px-3 py-2 rounded-md button-accent"
                  onClick={() => handleVote(flip, candidate, +1)}
                  aria-label="Thumbs up"
                >
                  👍
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
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
  el.style.transition =
    "transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms";
  if (effect === "burst")
    el.style.clipPath = "polygon(0 0, 100% 0, 80% 100%, 20% 100%)";
  if (effect === "flip") el.style.clipPath = "inset(0 round 12px)";
  layer.appendChild(el);

  requestAnimationFrame(() => {
    if (effect === "flip") {
      el.animate(
        [{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }],
        { duration: 500, easing: "ease-in-out" }
      );
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
            {
              transform: `translateY(-50%) translate(${rand(-40, 40)}px, ${rand(
                -10,
                10
              )}px)`,
            },
            {
              transform: `translateY(120%) translate(${rand(-80, 80)}px, ${rand(
                40,
                140
              )}px)`,
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
