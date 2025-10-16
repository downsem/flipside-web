// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES } from "@/theme/timelines";
import type { TimelineId, TimelineSpec } from "@/theme/timelines";
import { postFeedback } from "@/lib/feedback";

// ---------- Types ----------
type Candidate = { candidate_id: string; text: string };
type Flip = { flip_id: string; original: string; candidates: Candidate[] };

type Props = {
  /** Optional. If omitted, we’ll fetch flips using originalText. */
  initialFlips?: Flip[];
  /** Provide original text to fetch flips from the API when initialFlips is empty. */
  originalText?: string;
  /** Optional. Falls back to NEXT_PUBLIC_API_BASE if omitted. */
  apiBase?: string;
};

// ---------- Helpers ----------
const LABEL_TO_ID: Record<string, TimelineId> = Object.values(TIMELINES).reduce(
  (acc, t) => {
    acc[t.label] = t.id;
    return acc;
  },
  {} as Record<string, TimelineId>
);

const API_BASE_FROM_ENV =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) || "";

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

// ---------- Component ----------
export default function SwipeDeck({
  initialFlips = [],
  originalText,
  apiBase,
}: Props) {
  const { theme, timelineId, setTimeline } = useTheme();
  const API_BASE = apiBase ?? API_BASE_FROM_ENV;

  // state
  const [flips, setFlips] = useState<Flip[]>(Array.isArray(initialFlips) ? initialFlips : []);
  const [activeIndex, setActiveIndex] = useState<number>(-1); // -1 means "original"
  const [lastFlipIndex, setLastFlipIndex] = useState<number>(0); // to support "Return to flip"
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // build sound on demand
  const ensureSound = () => {
    if (!theme?.sound?.src) return null;
    if (!audioRef.current) {
      const a = new Audio(theme.sound.src);
      a.volume = theme.sound.volume ?? 0.25;
      audioRef.current = a;
    }
    return audioRef.current;
  };

  // fetch flips if needed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (flips.length || !originalText || !API_BASE) return;
      try {
        setLoading(true);
        setErr(null);
        const kinds = Object.values(TIMELINES).map((t) => t.label); // API accepts labels
        const res = await fetch(`${API_BASE}/flips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originalText, promptKinds: kinds }),
        });
        if (!res.ok) {
          const msg = await safeText(res);
          throw new Error(`API ${res.status}: ${msg || res.statusText}`);
        }
        const data: { flips: { promptKind: string; text: string }[] } = await res.json();
        const built: Flip[] = data.flips.map((f, i) => ({
          flip_id: `f-${i}`,
          original: originalText,
          candidates: [{ candidate_id: `c-${i}`, text: f.text }],
        }));
        if (!cancelled) setFlips(built);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalText, API_BASE]); // don't include flips to avoid loops

  // keep theme synced with active card
  const activeTimelineId: TimelineId | null = useMemo(() => {
    if (activeIndex < 0) return null; // original/neutral
    const f = flips[activeIndex];
    // We infer by label sent from API (promptKind)
    // When we built from API we kept .original and .candidates[0].text only,
    // but we still can map to the label order by index. To be safer, attach a label by index:
    // Here we try to derive by index first; fallback to calm.
    const idByIndex = (Object.values(TIMELINES)[activeIndex]?.id ??
      "calm") as TimelineId;
    return idByIndex;
  }, [activeIndex, flips]);

  useEffect(() => {
    // go neutral on original card or when finished
    if (activeIndex < 0 || activeIndex >= flips.length) {
      setTimeline("calm" as TimelineId);
    } else if (activeTimelineId) {
      setTimeline(activeTimelineId);
    }
  }, [activeIndex, flips.length, activeTimelineId, setTimeline]);

  // voting + swipe handling
  async function handleVote(flip: Flip, chosen: Candidate, signal: 1 | -1) {
    // haptics + sound
    if (typeof navigator !== "undefined" && "vibrate" in navigator && theme?.haptics?.pattern) {
      navigator.vibrate(theme.haptics.pattern);
    }
    const a = ensureSound();
    a?.play().catch(() => {});
    triggerSwipeEffect(theme?.motion?.swipeRightEffect);

    // analytics/feedback sink (best effort)
    void postFeedback({
      flip_id: flip.flip_id,
      candidate_id: chosen.candidate_id,
      signal,
      timeline_id: (timelineId as string) || "unknown",
      seen_ms: 1800,
      context: { device: "web" },
    });

    // advance to next flip
    setActiveIndex((i) => Math.min(i + 1, flips.length)); // allow i === flips.length => "done"
  }

  function onTapCard() {
    // clicking/tapping advances within stack (from original -> first, then forward)
    if (activeIndex < 0) {
      setActiveIndex(0);
      setLastFlipIndex(0);
    } else if (activeIndex < flips.length - 1) {
      setLastFlipIndex(activeIndex + 1);
      setActiveIndex((i) => i + 1);
    } else {
      // finished; show "done" state (neutral)
      setActiveIndex(flips.length);
    }
  }

  function goToOriginal() {
    setLastFlipIndex(Math.max(activeIndex, 0));
    setActiveIndex(-1);
  }

  function returnToFlip() {
    setActiveIndex((prev) =>
      prev < 0 ? Math.min(Math.max(lastFlipIndex, 0), flips.length - 1) : prev
    );
  }

  // ---------- Render ----------
  const showDone = activeIndex >= flips.length && flips.length > 0;
  const showOriginal = activeIndex < 0;

  // minimal guard UI always renders (avoids conditional-hooks errors)
  return (
    <div className="relative min-h-[70vh] overflow-hidden theme-surface rounded-xl p-4">
      {/* controls row */}
      <div className="flex gap-2 mb-3">
        {showOriginal ? (
          flips.length > 0 && (
            <button
              className="px-3 py-2 rounded-md border border-black/10"
              onClick={returnToFlip}
            >
              Return to flip
            </button>
          )
        ) : (
          <button className="px-3 py-2 rounded-md border border-black/10" onClick={goToOriginal}>
            Original
          </button>
        )}
      </div>

      {/* content area */}
      <div
        className="relative min-h-[56vh] rounded-xl theme-surface overflow-hidden"
        onClick={onTapCard}
        role="button"
      >
        {/* Original / Neutral */}
        {showOriginal && (
          <motion.div
            key="original"
            className="absolute inset-0 m-4 rounded-xl shadow-lg bg-white text-black"
            initial={{ opacity: 0.9, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 70, damping: 16 } as any}
          >
            <div className="p-5 space-y-3">
              <div className="text-xs opacity-70">ORIGINAL POST</div>
              <p className="text-lg leading-7">
                {originalText ?? flips[0]?.original ?? "—"}
              </p>
              <p className="text-xs opacity-60 pt-3">(tap to see flips)</p>
            </div>
          </motion.div>
        )}

        {/* Active flip card */}
        {!showOriginal && !showDone && flips[activeIndex] && (
          <motion.div
            key={flips[activeIndex].flip_id}
            className="absolute inset-0 m-4 rounded-xl shadow-lg"
            style={{
              background: "#fff",
              color: "#111",
              border: `2px solid ${theme.colors.accent}`,
            }}
            initial={(theme.motion.enter as any) ?? { opacity: 0.95, scale: 0.985 }}
            animate={(theme.motion.animate as any) ?? { opacity: 1, scale: 1 }}
            transition={(theme.motion.transition as any) ?? { type: "spring", stiffness: 60, damping: 14 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              const x = info.offset.x;
              const candidate = flips[activeIndex].candidates?.[0];
              if (!candidate) return;
              if (x > 120) handleVote(flips[activeIndex], candidate, +1);
              else if (x < -120) handleVote(flips[activeIndex], candidate, -1);
            }}
          >
            <div className="p-5 space-y-3">
              <div className="text-xs opacity-70">
                {theme.icon} {theme.label}
              </div>
              <div className="text-sm opacity-70">Through this lens</div>
              <p className="text-lg leading-7">{flips[activeIndex].candidates[0].text}</p>
              <div className="flex gap-2 pt-4">
                <button
                  className="px-3 py-2 rounded-md border border-black/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(flips[activeIndex], flips[activeIndex].candidates[0], -1);
                  }}
                >
                  👎
                </button>
                <button
                  className="px-3 py-2 rounded-md button-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(flips[activeIndex], flips[activeIndex].candidates[0], +1);
                  }}
                >
                  👍
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Finished state */}
        {showDone && (
          <div className="absolute inset-0 m-4 rounded-xl grid place-items-center border border-black/10 bg-white/70 text-black">
            <div className="text-center space-y-2">
              <div className="text-base font-medium">That’s everything for now</div>
              <div className="text-xs opacity-70">tap Original to reread or scroll for the next post</div>
            </div>
          </div>
        )}
      </div>

      {/* status/errors */}
      {loading && (
        <div className="mt-3 text-xs opacity-60">Generating flips…</div>
      )}
      {err && (
        <div className="mt-3 text-xs text-red-600">Error: {err}</div>
      )}

      <div id="swipe-effect-layer" className="pointer-events-none absolute inset-0" />
    </div>
  );
}

// small helper to avoid throwing when body isn’t JSON
async function safeText(res: Response) {
  try {
    const t = await res.text();
    return t;
  } catch {
    return "";
  }
}
