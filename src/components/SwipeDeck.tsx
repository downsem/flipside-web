"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/app/firebase";
import type { TimelineId, TimelineSpec } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";

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

  // Subscribe to rewrites for this post
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
        if (id) {
          map[id] = { id, ...data };
        }
      });

      setRewrites(map);
    });

    return () => unsub();
  }, [post.id]);

  // Reset card index when filter changes
  useEffect(() => {
    setIndex(0);
  }, [selectedTimeline]);

  const cards: FlipCard[] = useMemo(() => {
    if (selectedTimeline === "all") {
      const list: FlipCard[] = [
        {
          id: "original",
          label: "Original",
          text: post.text,
        },
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
    } else {
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
    }
  }, [post.text, rewrites, selectedTimeline]);

  const current = cards[index] ?? cards[0];

  function handlePrev() {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function handleNext() {
    setIndex((prev) => (prev < cards.length - 1 ? prev + 1 : prev));
  }

  async function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    await onReply(current.id, trimmed);
    setReplyText("");
  }

  // Label for the source link
  const sourceLabel =
    post.sourcePlatform && post.sourcePlatform !== "other"
      ? post.sourcePlatform.charAt(0).toUpperCase() +
        post.sourcePlatform.slice(1)
      : "Source";

  return (
    <div className="space-y-3">
      {/* Header row: left = badge + source link, right = pager */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          {/* Lens badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
            <span className="text-[11px] font-medium text-slate-700">
              {current.icon && <span className="mr-1">{current.icon}</span>}
              {current.label}
            </span>
          </div>

          {/* Source link to the RIGHT of badge (shown on all cards) */}
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 underline"
            >
              {sourceLabel} ↗
            </a>
          )}
        </div>

        {/* Pager */}
        {cards.length > 1 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={handlePrev}
              disabled={index === 0}
              className="px-2 py-1 rounded-full border border-slate-200 disabled:opacity-40"
            >
              ‹
            </button>
            <span>
              {index + 1}/{cards.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={index === cards.length - 1}
              className="px-2 py-1 rounded-full border border-slate-200 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 whitespace-pre-wrap">
        {current.text}
      </div>

      {/* Actions: vote + reply */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {/* Neutral styles for both buttons so nothing looks pre-selected */}
          <button
            type="button"
            onClick={() => onVote(current.id, 1)}
            className="px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-700"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => onVote(current.id, -1)}
            className="px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-700"
          >
            👎
          </button>
        </div>
      </div>

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
