// src/components/SwipeDeck.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/app/firebase";
import type { TimelineId, TimelineSpec } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";
import { LensTabs, type Lens, LENSES } from "@/components/deck/LensTabs";
import { useSwipe } from "@/components/deck/useSwipe";

type FlipCard = {
  id: "original" | TimelineId;
  label: string;
  icon?: string;
  text: string;
};

type SwipeDeckProps = {
  post: any;
  selectedTimeline: "all" | TimelineId;
  onVote: (timelineId: "original" | TimelineId, value: number) => void;
  onReply: (timelineId: "original" | TimelineId, text: string) => void;
};

type VoteValue = -1 | 0 | 1;

export default function SwipeDeck({
  post,
  selectedTimeline,
  onVote,
  onReply,
}: SwipeDeckProps) {
  const [rewrites, setRewrites] = useState<Record<TimelineId, any>>({
    calm: undefined,
    bridge: undefined,
    cynical: undefined,
    opposite: undefined,
    playful: undefined,
  });

  const [index, setIndex] = useState(0);
  const [replyText, setReplyText] = useState("");

  // Local-only vote state per card in this deck (prevents default-selected UI + double-voting)
  // Keyed by card id: "original" | TimelineId
  const [localVotes, setLocalVotes] = useState<Record<string, VoteValue>>({});

  useEffect(() => {
    const rewritesRef = collection(db, "posts", post.id, "rewrites");
    const q = query(rewritesRef);

    const unsub = onSnapshot(q, (snap) => {
      const map: Record<TimelineId, any> = {
        calm: undefined as any,
        bridge: undefined as any,
        cynical: undefined as any,
        opposite: undefined as any,
        playful: undefined as any,
      };

      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const id = data.timelineId as TimelineId;
        if (id) map[id] = { id, ...data };
      });

      setRewrites(map);
    });

    return () => unsub();
  }, [post.id]);

  useEffect(() => {
    setIndex(0);
  }, [selectedTimeline]);

  // If the post changes, clear local vote UI state (new deck)
  useEffect(() => {
    setLocalVotes({});
  }, [post.id]);

  const cards: FlipCard[] = useMemo(() => {
    if (selectedTimeline === "all") {
      const list: FlipCard[] = [
        { id: "original", label: "Original", text: post.text },
      ];

      TIMELINE_LIST.forEach((t: TimelineSpec) => {
        const rw = rewrites[t.id];
        list.push({
          id: t.id,
          label: t.label,
          icon: t.icon,
          text: rw?.text || "(Generating rewrite…)",
        });
      });

      return list;
    }

    const t = TIMELINE_LIST.find((tl) => tl.id === selectedTimeline)!;
    const rw = rewrites[t.id];
    return [
      {
        id: t.id,
        label: t.label,
        icon: t.icon,
        text: rw?.text || "(Generating rewrite…)",
      },
    ];
  }, [post.text, rewrites, selectedTimeline]);

  const current = cards[index] ?? cards[0];
  const currentVote: VoteValue = (localVotes[current.id] ?? 0) as VoteValue;

  // LensTabs is only meaningful when we're showing the full deck.
  const showLensTabs = selectedTimeline === "all" && cards.length > 1;

  // LensTabs uses SHORT names (Calm/Bridge/...) but TIMELINE_LIST labels are longer
  // (e.g. "Calm-Constructive"). Never key behavior off label text.
  const ID_TO_LENS: Record<string, Lens> = {
    original: "Original",
    calm: "Calm",
    bridge: "Bridge",
    cynical: "Cynical",
    opposite: "Opposite",
    playful: "Playful",
  };

  const LENS_TO_ID: Record<Lens, "original" | TimelineId> = {
    Original: "original",
    Calm: "calm",
    Bridge: "bridge",
    Cynical: "cynical",
    Opposite: "opposite",
    Playful: "playful",
  };

  const lensValue: Lens = useMemo(() => {
    if (!showLensTabs) return "Original";
    return ID_TO_LENS[current.id] ?? "Original";
  }, [current.id, showLensTabs]);

  const lensIndex = useMemo(() => {
    const i = LENSES.indexOf(lensValue);
    return i >= 0 ? i : 0;
  }, [lensValue]);

  function setLens(lens: Lens) {
    if (!showLensTabs) return;
    const targetId = LENS_TO_ID[lens];
    const idx = cards.findIndex((c) => c.id === targetId);
    setIndex(idx >= 0 ? idx : 0);
  }

  function handlePrev() {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function handleNext() {
    setIndex((prev) => (prev < cards.length - 1 ? prev + 1 : prev));
  }

  const swipe = useSwipe({
    onLeft: handleNext,
    onRight: handlePrev,
    threshold: 40,
  });

  async function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    await onReply(current.id, trimmed);
    setReplyText("");
  }

  function handleLocalVoteClick(value: VoteValue) {
    // Toggle off on second click (UI only, does NOT decrement Firestore)
    if (currentVote === value) {
      setLocalVotes((prev) => ({ ...prev, [current.id]: 0 }));
      return;
    }

    // Prevent both / prevent changing vote after first selection unless toggled off
    if (currentVote !== 0) return;

    setLocalVotes((prev) => ({ ...prev, [current.id]: value }));
    onVote(current.id, value);
  }

  const hasSource = !!post?.sourceUrl;
  const sourceLabel =
    post?.sourcePlatform && post.sourcePlatform !== "other"
      ? post.sourcePlatform.charAt(0).toUpperCase() +
        post.sourcePlatform.slice(1)
      : "original post";

  // Share URL for the CURRENT card (lens-specific)
  const shareHref = `/share/${post.id}?lens=${encodeURIComponent(current.id)}`;

  const upSelected = currentVote === 1;
  const downSelected = currentVote === -1;

  return (
    <div className="space-y-3">
      {showLensTabs && (
        <LensTabs value={lensValue} index={lensIndex} onChange={setLens} />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        {!showLensTabs ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
            <span className="text-[11px] font-medium text-slate-700">
              {current.icon && <span className="mr-1">{current.icon}</span>}
              {current.label}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">Swipe or tap a lens</div>
        )}

        <div className="flex items-center gap-2">
          <Link
            href={shareHref}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Share lens
          </Link>
        </div>
      </div>

      {/* Attribution line */}
      {hasSource && (
        <div className="mt-1 text-[11px] text-slate-500">
          <span>This Flip was originally posted on: </span>
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all"
            title={sourceLabel}
          >
            {post.sourceUrl}
          </a>
        </div>
      )}

      {/* Text */}
      <div
        onPointerDown={showLensTabs ? swipe.onPointerDown : undefined}
        onPointerUp={showLensTabs ? swipe.onPointerUp : undefined}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 whitespace-pre-wrap touch-pan-y"
      >
        {current.text}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleLocalVoteClick(1)}
            disabled={downSelected} // prevent both
            className={
              upSelected
                ? "px-3 py-1 rounded-full bg-slate-900 text-white"
                : "px-3 py-1 rounded-full border border-slate-300 text-slate-700"
            }
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => handleLocalVoteClick(-1)}
            disabled={upSelected} // prevent both
            className={
              downSelected
                ? "px-3 py-1 rounded-full bg-slate-900 text-white"
                : "px-3 py-1 rounded-full border border-slate-300 text-slate-700"
            }
          >
            👎
          </button>
        </div>
      </div>

      {/* Reply */}
      <div className="flex items-center gap-2 text-[11px]">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to this version…"
          className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="button"
          onClick={handleReplySubmit}
          className="px-3 py-2 rounded-full bg-slate-800 text-white text-[11px]"
        >
          Reply
        </button>
      </div>
    </div>
  );
}
