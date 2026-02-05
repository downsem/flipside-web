"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineId, TimelineSpec } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";
import { usePrototypeStore } from "@/prototype/people/store";

type DeckCardId = "anchor" | TimelineId;

type DeckCard = {
  id: DeckCardId;
  label: string;
  icon?: string;
  postId: string;
  text: string;
  authorLabel: string;
};

export default function PeopleDeckSwipe({ deck }: { deck: any }) {
  const voteOnPost = usePrototypeStore((s) => s.voteOnPost);
  const addReplyToPost = usePrototypeStore((s) => s.addReplyToPost);

  const [index, setIndex] = useState(0);
  const [replyText, setReplyText] = useState("");

  // Local selected vote per card for UI (prevents default-selected bugs)
  const [localVotes, setLocalVotes] = useState<Record<DeckCardId, -1 | 1 | null>>(
    () => ({
      anchor: null,
      calm: null,
      bridge: null,
      cynical: null,
      opposite: null,
      playful: null,
    })
  );

  const cards: DeckCard[] = useMemo(() => {
    const list: DeckCard[] = [];

    const anchor = deck?.anchor;
    list.push({
      id: "anchor",
      label: "Anchor",
      postId: anchor?.id ?? "anchor_missing",
      text: anchor?.text ?? "(Missing anchor)",
      authorLabel: anchor?.author
        ? `${anchor.author.name ?? anchor.author.displayName ?? "Unknown"} @${
            anchor.author.handle ?? "unknown"
          }`
        : deck?.ownerName
          ? `${deck.ownerName} ${deck.ownerHandle ?? ""}`.trim()
          : "Unknown",
    });

    TIMELINE_LIST.forEach((t: TimelineSpec) => {
      const m = deck?.locked?.[t.id];
      list.push({
        id: t.id,
        label: t.label,
        icon: t.icon,
        postId: m?.id ?? `${t.id}_missing`,
        text: m?.text ?? "(Missing match)",
        authorLabel: m?.author
          ? `${m.author.name ?? m.author.displayName ?? "Unknown"} @${m.author.handle ?? "unknown"}`
          : `${deck?.ownerName ?? "Unknown"} ${deck?.ownerHandle ?? ""}`.trim(),
      });
    });

    return list;
  }, [deck]);

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

  function voteBtnClass(isSelected: boolean) {
    return isSelected
      ? "px-3 py-1 rounded-full bg-slate-900 text-white"
      : "px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50";
  }

  function getCurrentPost() {
    if (!deck) return null;
    if (current.id === "anchor") return deck.anchor ?? null;
    return deck.locked?.[current.id] ?? null;
  }

  const currentPost = getCurrentPost();
  const votes = (currentPost?.votes ?? 0) as number;
  const replies = (currentPost?.replies ?? []) as Array<any>;

  function handleVoteClick(value: 1 | -1) {
    const next = selectedVote === value ? null : value;

    setLocalVotes((prev) => ({
      ...prev,
      [current.id]: next,
    }));

    if (next === null) return;
    if (!currentPost?.id) return;

    // Store updates the vote count on the post + any matching deck cards.
    voteOnPost(currentPost.id, next);
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    if (!currentPost?.id) return;

    addReplyToPost(currentPost.id, trimmed);
    setReplyText("");
  }

  return (
    <div className="space-y-3">
      {/* Header chip + pager (SwipeDeck feel) */}
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

      {/* Author */}
      <div className="text-[11px] text-slate-500">{current.authorLabel}</div>

      {/* Text */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 whitespace-pre-wrap">
        {current.text}
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
          <div className="text-[11px] font-medium text-slate-700 mb-2">Replies</div>
          <div className="space-y-2">
            {replies.slice(0, 3).map((r: any) => (
              <div key={r.id} className="text-xs text-slate-800">
                <span className="text-slate-500 mr-2">{r.author?.name ?? r.authorDisplayName ?? "Anon"}</span>
                {r.text}
              </div>
            ))}
            {replies.length > 3 && (
              <div className="text-[11px] text-slate-500">+ {replies.length - 3} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
