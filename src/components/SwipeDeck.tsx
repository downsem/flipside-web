// src/components/SwipeDeck.tsx
"use client";

import React, { useMemo, useState } from "react";
import { PROMPTS, type PromptKey } from "../utils/prompts";

type GeneratedFlip = {
  key: PromptKey;
  text: string;
};

type Props = {
  originalText: string;
  apiBase: string; // NEXT_PUBLIC_API_BASE
  onVote?: (args: {
    index: number;                                    // -1 for original
    key: PromptKey | "original";                      // "original" for the source post
    value: "up" | "down" | null;
    text: string;                                     // the text that was voted on
  }) => Promise<void> | void;
  onReply?: (args: {
    index: number;                                    // -1 for original
    key: PromptKey | "original";                      // "original" for the source post
    text: string;                                     // reply body
    flipText: string;                                 // the text being replied to
  }) => Promise<void> | void;
};

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

  // votes/replies for the ORIGINAL post
  const [originalVote, setOriginalVote] = useState<"up" | "down" | null>(null);
  const [originalReply, setOriginalReply] = useState<string>("");

  const [err, setErr] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true); // start on original

  const count = flips.length;
  const haveFlips = count > 0;
  const current = flips[index];

  const promptKeys = useMemo<PromptKey[]>(
    () => PROMPTS.map((p) => p.key),
    []
  );

  async function generateAll() {
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
        throw new Error(
          `API returned ${res.status}${msg ? `: ${msg}` : ""}`.trim()
        );
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
      setVotes({});           // neutral by default
      setReplyDrafts({});
      setPhase("showing");
      setShowOriginal(false); // jump right to first flip
    } catch (e: any) {
      setErr(e?.message || "Failed to generate flips");
      setPhase("idle");
      setShowOriginal(true);
    }
  }

  function advance() {
    if (!haveFlips) return;
    setIndex((i) => ((i + 1) % count));
  }

  // ---- voting ----
  async function setVoteFlip(value: "up" | "down") {
    if (!haveFlips) return;
    const next = votes[index] === value ? null : value; // toggle
    setVotes((v) => ({ ...v, [index]: next }));
    try {
      await onVote?.({
        index,
        key: current.key,
        value: next,
        text: current.text,
      });
    } catch {}
  }

  async function setVoteOriginal(value: "up" | "down") {
    const next = originalVote === value ? null : value; // toggle
    setOriginalVote(next);
    try {
      await onVote?.({
        index: -1,
        key: "original",
        value: next,
        text: originalText,
      });
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
      await onReply?.({
        index,
        key: current.key,
        text: draft,
        flipText: current.text,
      });
      setReplyDrafts((m) => ({ ...m, [index]: "" }));
    } catch {}
  }

  async function submitReplyOriginal() {
    const draft = originalReply.trim();
    if (!draft) return;
    try {
      await onReply?.({
        index: -1,
        key: "original",
        text: draft,
        flipText: originalText,
      });
      setOriginalReply("");
    } catch {}
  }

  // --- UI ---

  const cardText = showOriginal ? originalText : (current?.text ?? "");

  return (
    <div className="mt-3 space-y-3">
      {/* Card — only advances when viewing a flip */}
      <div
        className={`rounded-2xl border bg-white p-4 shadow-sm select-none ${
          showOriginal ? "" : "cursor-pointer"
        }`}
        onClick={() => {
          if (!showOriginal) advance();
        }}
        role="button"
        aria-label="Flip text card"
      >
        {showOriginal && (
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
            Original post
          </div>
        )}
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {cardText}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Votes shown on BOTH original and flips */}
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

        {/* When on original and no flips yet: CTA to generate */}
        {showOriginal && !haveFlips && phase !== "loading" && (
          <button
            onClick={generateAll}
            className="rounded-full bg-black text-white px-3 py-1.5 text-sm hover:bg-gray-800"
            type="button"
          >
            See the flips
          </button>
        )}

        {/* When on original and flips already exist: go back to current flip */}
        {showOriginal && haveFlips && (
          <button
            onClick={() => setShowOriginal(false)}
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
            type="button"
          >
            Back to Flip
          </button>
        )}

        {/* When on a flip: allow returning to original */}
        {!showOriginal && haveFlips && (
          <button
            onClick={() => setShowOriginal(true)}
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
            type="button"
          >
            Show Original
          </button>
        )}
      </div>

      {/* Reply inputs for ORIGINAL vs FLIP */}
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

      {/* Progress + hint (only for flips) */}
      {!showOriginal && haveFlips && (
        <div className="text-xs text-gray-500">
          {index + 1} / {count} &nbsp;•&nbsp; Tap the card to see the next flip
        </div>
      )}

      {phase === "loading" && (
        <div className="text-sm text-gray-600">Generating flips…</div>
      )}
      {err && <div className="text-sm text-red-600">Error: {err}</div>}
    </div>
  );
}
