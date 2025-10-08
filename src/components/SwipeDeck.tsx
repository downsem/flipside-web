// src/components/SwipeDeck.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { PROMPTS, type PromptKey } from "../utils/prompts";

type GeneratedFlip = { key: PromptKey; text: string };

type Props = {
  originalText: string;
  apiBase: string; // NEXT_PUBLIC_API_BASE
  onVote?: (args: {
    index: number;                   // -1 for original
    key: PromptKey | "original";
    value: "up" | "down" | null;
    text: string;
  }) => Promise<void> | void;
  onReply?: (args: {
    index: number;                   // -1 for original
    key: PromptKey | "original";
    text: string;                    // reply body
    flipText: string;                // the text being replied to
  }) => Promise<void> | void;
};

const SWIPE_THRESHOLD_PX = 48;
const MAX_TINT_OPACITY = 0.35;
const MAX_ROTATE_DEG = 8;

export default function SwipeDeck({
  originalText,
  apiBase,
  onVote,
  onReply,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "showing">("idle");
  const [flips, setFlips] = useState<GeneratedFlip[]>([]);
  const [index, setIndex] = useState(0);

  // votes/replies for flips
  const [votes, setVotes] = useState<Record<number, "up" | "down" | null>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  // ORIGINAL votes/replies
  const [originalVote, setOriginalVote] = useState<"up" | "down" | null>(null);
  const [originalReply, setOriginalReply] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true); // start on original

  const count = flips.length;
  const haveFlips = count > 0;
  const current = flips[index];

  const promptKeys = useMemo<PromptKey[]>(() => PROMPTS.map((p) => p.key), []);

  // --- gesture / animation state ---
  const startX = useRef<number | null>(null);
  const deltaRef = useRef(0); // logic
  const [dragX, setDragX] = useState(0); // visuals
  const [dragging, setDragging] = useState(false);

  const generatingRef = useRef(false);

  async function generateAll() {
    if (generatingRef.current) return;
    generatingRef.current = true;

    setErr(null);
    setPhase("loading");
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/generate_flips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText, promptKinds: promptKeys }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`API returned ${res.status}${msg ? `: ${msg}` : ""}`.trim());
      }
      const data = (await res.json()) as {
        flips: { promptKind: string; text: string }[];
      };

      const keyed = new Map(
        data.flips
          .filter((f) => promptKeys.includes(f.promptKind as PromptKey))
          .map((f) => [f.promptKind, f.text] as const)
      );

      const ordered: GeneratedFlip[] = promptKeys
        .filter((k) => keyed.has(k))
        .map((k) => ({ key: k, text: keyed.get(k)! }));

      if (ordered.length === 0) throw new Error("No flips returned.");

      setFlips(ordered);
      setIndex(0);
      setVotes({});
      setReplyDrafts({});
      setPhase("showing");
      setShowOriginal(false); // jump straight to first flip
    } catch (e: any) {
      setErr(e?.message || "Failed to generate flips");
      setPhase("idle");
      setShowOriginal(true);
    } finally {
      generatingRef.current = false;
    }
  }

  function advance() {
    if (!haveFlips) return;
    setIndex((i) => (i + 1) % count);
  }

  // ---- voting helpers ----
  async function setVoteFlip(value: "up" | "down") {
    if (!haveFlips) return;
    const next = votes[index] === value ? null : value;
    setVotes((v) => ({ ...v, [index]: next }));
    try {
      await onVote?.({ index, key: current.key, value: next, text: current.text });
    } catch {}
  }

  async function setVoteOriginal(value: "up" | "down") {
    const next = originalVote === value ? null : value;
    setOriginalVote(next);
    try {
      await onVote?.({ index: -1, key: "original", value: next, text: originalText });
    } catch {}
  }

  // ---- replies ----
  function updateReplyDraftFlip(val: string) {
    if (!haveFlips) return;
    setReplyDrafts((m) => ({ ...m, [index]: val }));
  }

  async function submitReplyFlip() {
    if (!haveFlips) return;
    const draft = (replyDrafts[index] || "").trim();
    if (!draft) return;
    try {
      await onReply?.({ index, key: current.key, text: draft, flipText: current.text });
      setReplyDrafts((m) => ({ ...m, [index]: "" }));
    } catch {}
  }

  async function submitReplyOriginal() {
    const draft = originalReply.trim();
    if (!draft) return;
    try {
      await onReply?.({ index: -1, key: "original", text: draft, flipText: originalText });
      setOriginalReply("");
    } catch {}
  }

  // ---- gestures (with visuals) ----
  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    deltaRef.current = 0;
    setDragX(0);
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current == null) return;
    const d = e.touches[0].clientX - startX.current;
    deltaRef.current = d;
    setDragX(d);
  }
  function resetDrag() {
    setDragging(false);
    setDragX(0);
    deltaRef.current = 0;
  }
  function onTouchEnd() {
    const delta = deltaRef.current;
    const passed = Math.abs(delta) >= SWIPE_THRESHOLD_PX;

    // allow snap-back via CSS transition
    resetDrag();

    if (!passed) return;

    if (showOriginal) {
      // ORIGINAL: vote + generate/show first flip
      if (delta > 0) setVoteOriginal("up");
      else setVoteOriginal("down");

      if (haveFlips) setShowOriginal(false);
      else generateAll();
      return;
    }

    // FLIP: vote + advance
    if (haveFlips) {
      if (delta > 0) setVoteFlip("up");
      else setVoteFlip("down");
      advance();
    }
  }

  // Card visuals
  const cardText = showOriginal ? originalText : current?.text ?? "";
  const dragMagnitude = Math.min(1, Math.abs(dragX) / 160);
  const rotate =
    Math.max(-1, Math.min(1, dragX / 160)) * MAX_ROTATE_DEG;
  const tintOpacity = Math.min(dragMagnitude, MAX_TINT_OPACITY);

  const cardTransform = `translateX(${dragX}px) rotate(${rotate.toFixed(2)}deg)`;
  const cardTransition = dragging ? "transform 0ms" : "transform 180ms ease-out";

  return (
    <div className="mt-3 space-y-3 overscroll-contain tap-transparent">
      {/* Card with animated transform / tint / emoji overlay */}
      <div
        className="relative rounded-2xl border bg-white p-4 shadow-sm select-none touch-none"
        style={{
          transform: cardTransform,
          transition: cardTransition,
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        onClick={() => {
          if (showOriginal) {
            if (haveFlips) setShowOriginal(false);
            else generateAll();
          } else {
            advance();
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={resetDrag}
        role="button"
        aria-label="Flip text card"
      >
        {/* tint layer */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            backgroundColor:
              dragX > 0
                ? "rgb(220 252 231)" // green-50
                : dragX < 0
                ? "rgb(254 226 226)" // red-50
                : "transparent",
            opacity: tintOpacity,
          }}
        />
        {/* emoji badges */}
        <div
          className="pointer-events-none absolute left-3 top-2 text-3xl"
          style={{ opacity: dragX < 0 ? Math.min(Math.abs(dragX) / 120, 0.9) : 0 }}
        >
          👎
        </div>
        <div
          className="pointer-events-none absolute right-3 top-2 text-3xl"
          style={{ opacity: dragX > 0 ? Math.min(Math.abs(dragX) / 120, 0.9) : 0 }}
        >
          👍
        </div>

        {showOriginal && (
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
            Original post
          </div>
        )}
        <div className="text-base leading-relaxed whitespace-pre-wrap relative">
          {cardText}
        </div>

        {phase === "loading" && showOriginal && (
          <div className="mt-2 text-xs text-gray-500">Generating flips…</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {showOriginal ? (
          <>
            <button
              onClick={() => setVoteOriginal("down")}
              className={`rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 ${
                originalVote === "down" ? "border-red-500 bg-red-50" : ""
              }`}
              aria-label="Dislike original"
              type="button"
            >
              👎
            </button>
            <button
              onClick={() => setVoteOriginal("up")}
              className={`rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 ${
                originalVote === "up" ? "border-green-500 bg-green-50" : ""
              }`}
              aria-label="Like original"
              type="button"
            >
              👍
            </button>
          </>
        ) : (
          haveFlips && (
            <>
              <button
                onClick={() => setVoteFlip("down")}
                className={`rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 ${
                  votes[index] === "down" ? "border-red-500 bg-red-50" : ""
                }`}
                aria-label="Dislike flip"
                type="button"
              >
                👎
              </button>
              <button
                onClick={() => setVoteFlip("up")}
                className={`rounded-full border px-4 py-2 text-sm hover:bg-neutral-50 ${
                  votes[index] === "up" ? "border-green-500 bg-green-50" : ""
                }`}
                aria-label="Like flip"
                type="button"
              >
                👍
              </button>
            </>
          )
        )}

        <div className="ml-auto" />

        {haveFlips && showOriginal && (
          <button
            onClick={() => setShowOriginal(false)}
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
            type="button"
          >
            Back to Flip
          </button>
        )}
        {haveFlips && !showOriginal && (
          <button
            onClick={() => setShowOriginal(true)}
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
            type="button"
          >
            Show Original
          </button>
        )}
      </div>

      {/* Replies */}
      {showOriginal ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={originalReply}
            onChange={(e) => setOriginalReply(e.target.value)}
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            placeholder="Reply to the original…"
          />
          <button
            onClick={submitReplyOriginal}
            className="rounded-xl bg-black text-white px-3 py-2 text-sm hover:bg-gray-800"
            type="button"
          >
            Reply
          </button>
        </div>
      ) : (
        haveFlips && (
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={replyDrafts[index] || ""}
              onChange={(e) => updateReplyDraftFlip(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              placeholder="Reply to this flip…"
            />
            <button
              onClick={submitReplyFlip}
              className="rounded-xl bg-black text-white px-3 py-2 text-sm hover:bg-gray-800"
              type="button"
            >
              Reply
            </button>
          </div>
        )
      )}

      {!showOriginal && haveFlips && (
        <div className="text-xs text-gray-500" aria-live="polite">
          {index + 1} / {count} &nbsp;•&nbsp; Swipe ← for 👎, → for 👍, tap to skip
        </div>
      )}

      {err && <div className="text-sm text-red-600">Error: {err}</div>}
    </div>
  );
}
