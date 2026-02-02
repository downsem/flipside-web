"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineId } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { MvpMockPost, MvpMockRewrites } from "./mock";

type CardId = "original" | TimelineId;

type Props = {
  post: MvpMockPost;
  rewrites: MvpMockRewrites;
  selectedTimeline?: "all" | TimelineId;
};

type VoteValue = -1 | 0 | 1;

export default function SwipeDeckMock({ post, rewrites, selectedTimeline = "all" }: Props) {
  const [index, setIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [localVotes, setLocalVotes] = useState<Record<string, VoteValue>>({});
  const [replies, setReplies] = useState<Array<{ id: string; cardId: CardId; text: string }>>([]);

  const cards = useMemo(() => {
    if (selectedTimeline === "all") {
      const list = [{ id: "original" as const, label: "Original", icon: "", text: post.text }];
      for (const t of TIMELINE_LIST) {
        list.push({
          id: t.id,
          label: t.label,
          icon: t.icon,
          text: rewrites[t.id]?.text ?? "(Generating rewrite…)",
        });
      }
      return list;
    }

    const t = TIMELINE_LIST.find((x) => x.id === selectedTimeline);
    if (!t) return [{ id: "original" as const, label: "Original", icon: "", text: post.text }];

    return [
      {
        id: t.id,
        label: t.label,
        icon: t.icon,
        text: rewrites[t.id]?.text ?? "(Generating rewrite…)",
      },
    ];
  }, [post.text, rewrites, selectedTimeline]);

  useEffect(() => {
    setIndex(0);
  }, [selectedTimeline]);

  const current = cards[index] ?? cards[0];
  const currentVote: VoteValue = (localVotes[current.id] ?? 0) as VoteValue;
  const upSelected = currentVote === 1;
  const downSelected = currentVote === -1;

  function handlePrev() {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function handleNext() {
    setIndex((prev) => (prev < cards.length - 1 ? prev + 1 : prev));
  }

  function handleVote(value: VoteValue) {
    if (currentVote === value) {
      setLocalVotes((prev) => ({ ...prev, [current.id]: 0 }));
      return;
    }
    if (currentVote !== 0) return;
    setLocalVotes((prev) => ({ ...prev, [current.id]: value }));
  }

  function submitReply() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setReplies((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, cardId: current.id, text: trimmed },
    ]);
    setReplyText("");
  }

  function openShare() {
    // Sandbox-only share: just show a small modal with the lens payload.
    alert(
      `Share this lens (tutorial sandbox)\n\nLens: ${current.label}\n\nText:\n${current.text.slice(0, 220)}${current.text.length > 220 ? "…" : ""}`
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
          <span className="text-[11px] font-medium text-slate-700">
            {current.icon ? <span className="mr-1">{current.icon}</span> : null}
            {current.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openShare}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Share lens
          </button>

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
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 whitespace-pre-wrap">
        {current.text}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={downSelected}
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
            onClick={() => handleVote(-1)}
            disabled={upSelected}
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
          onClick={submitReply}
          className="px-3 py-2 rounded-full bg-slate-800 text-white text-[11px]"
        >
          Reply
        </button>
      </div>

      {replies.filter((r) => r.cardId === current.id).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-medium text-slate-700">Replies (sandbox)</div>
          <div className="mt-2 space-y-2">
            {replies
              .filter((r) => r.cardId === current.id)
              .slice(-3)
              .map((r) => (
                <div key={r.id} className="text-xs text-slate-700">
                  • {r.text}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
