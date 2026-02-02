"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineId } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { PeopleDeckPublished, MockPost } from "@/prototype/people/types";

type CardId = "anchor" | TimelineId;

type DeckCard = {
  id: CardId;
  label: string;
  icon?: string;
  post: MockPost;
};

export default function PeopleDeckSwipeDeck(props: {
  deck: PeopleDeckPublished;
  onVote: (postId: string, value: 1 | -1) => void;
  onReply: (postId: string, text: string) => void;
}) {
  const { deck, onVote, onReply } = props;

  const cards: DeckCard[] = useMemo(() => {
    const list: DeckCard[] = [
      { id: "anchor", label: "Anchor", icon: "⚓", post: deck.anchor },
    ];

    TIMELINE_LIST.forEach((t) => {
      list.push({
        id: t.id,
        label: t.label,
        icon: t.icon,
        post: deck.locked[t.id],
      });
    });

    return list;
  }, [deck]);

  const [index, setIndex] = useState(0);
  const [replyText, setReplyText] = useState("");

  // Local selected vote per card for UI (prevents default-selected + double count)
  const [localVotes, setLocalVotes] = useState<Record<CardId, -1 | 1 | null>>(
    () => ({
      anchor: null,
      calm: null,
      bridge: null,
      cynical: null,
      opposite: null,
      playful: null,
    })
  );

  const current = cards[index] ?? cards[0];

  useEffect(() => {
    setReplyText("");
  }, [index]);

  function handlePrev() {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function handleNext() {
    setIndex((prev) => (prev < cards.length - 1 ? prev + 1 : prev));
  }

  const selectedVote = localVotes[current.id] ?? null;
  const votes = current.post.votes ?? 0;
  const replies = current.post.replies ?? [];

  function voteBtnClass(isSelected: boolean) {
    return isSelected
      ? "px-3 py-1 rounded-full bg-slate-900 text-white"
      : "px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50";
  }

  function handleVoteClick(value: 1 | -1) {
    const next = selectedVote === value ? null : value;

    setLocalVotes((prev) => ({
      ...prev,
      [current.id]: next,
    }));

    if (next === null) return;
    onVote(current.post.id, next);
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(current.post.id, trimmed);
    setReplyText("");
  }

  return (
    <div className="space-y-3">
      {/* Header chip + pager (SwipeDeck-like) */}
      <div className="flex items-center justify-between mb-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
          <span className="text-[11px] font-medium text-slate-700">
            {current.icon && <span className="mr-1">{current.icon}</span>}
            {current.label}
          </span>
        </div>

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

      {/* Author line */}
      <div className="text-[11px] text-slate-500">
        {current.post.author.name} @{current.post.author.handle}
      </div>

      {/* Text block */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 whitespace-pre-wrap">
        {current.post.text}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleVoteClick(1)}
            className={voteBtnClass(selectedVote === 1)}
            aria-pressed={selectedVote === 1}
          >
            👍
          </button>

          <button
            type="button"
            onClick={() => handleVoteClick(-1)}
            className={voteBtnClass(selectedVote === -1)}
            aria-pressed={selectedVote === -1}
          >
            👎
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          Votes: {votes} • Replies: {replies.length}
        </div>
      </div>

      {/* Reply input */}
      <div className="flex items-center gap-2 text-[11px]">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to this card…"
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

      {/* Reply list */}
      {replies.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-medium text-slate-700 mb-2">
            Replies
          </div>
          <div className="space-y-2">
            {replies.slice(0, 3).map((r) => (
              <div key={r.id} className="text-xs text-slate-800">
                <span className="text-slate-500 mr-2">{r.author.name}</span>
                {r.text}
              </div>
            ))}
            {replies.length > 3 && (
              <div className="text-[11px] text-slate-500">
                + {replies.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
