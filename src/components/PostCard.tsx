// src/components/PostCard.tsx
"use client";

import React, { useState, FormEvent } from "react";
import type { TimelineId } from "@/theme/timelines";
import { getTimeline } from "@/theme/timelines";

import { db, auth, serverTimestamp } from "@/app/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

type CardType = "original" | "rewrite";

interface Card {
  id: string;
  type: CardType;
  timelineId?: TimelineId;
  label: string;
  text: string;
  votes?: number;
  replyCount?: number;
}

interface PostCardProps {
  postId: string;
  card: Card;
  isLoadingRewrites: boolean;
}

async function ensureAnonAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser?.uid ?? null;
}

export default function PostCard({
  postId,
  card,
  isLoadingRewrites,
}: PostCardProps) {
  const [pendingVote, setPendingVote] = useState<"up" | "down" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const isRewrite = card.type === "rewrite";

  const timelineSpec = card.timelineId ? getTimeline(card.timelineId) : null;

  async function handleVote(direction: "up" | "down") {
    if (!isRewrite || !card.id) return;

    try {
      setPendingVote(direction);
      await ensureAnonAuth();

      const rewriteRef = doc(db, "posts", postId, "rewrites", card.id);
      await updateDoc(rewriteRef, {
        votes: increment(direction === "up" ? 1 : -1),
      });
    } catch (err) {
      console.error("Error voting on rewrite:", err);
    } finally {
      setPendingVote(null);
    }
  }

  async function handleReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!isRewrite || !card.id || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const userId = await ensureAnonAuth();

      const repliesCol = collection(
        db,
        "posts",
        postId,
        "rewrites",
        card.id,
        "replies"
      );
      const replyRef = doc(repliesCol);

      await setDoc(replyRef, {
        id: replyRef.id,
        postId,
        rewriteId: card.id,
        text: replyText.trim(),
        authorId: userId,
        createdAt: serverTimestamp(),
      });

      const rewriteRef = doc(db, "posts", postId, "rewrites", card.id);
      await updateDoc(rewriteRef, {
        replyCount: increment(1),
      });

      setReplyText("");
    } catch (err) {
      console.error("Error submitting reply:", err);
    } finally {
      setSubmittingReply(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-gray-200 p-3 space-y-3 text-sm leading-relaxed"
      style={{
        backgroundColor: timelineSpec?.colors.bg ?? "#FFFFFF",
        color: timelineSpec?.colors.text ?? "#111827",
      }}
    >
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1 font-medium">
          {timelineSpec?.icon && <span>{timelineSpec.icon}</span>}
          <span>{card.label}</span>
        </span>
        {isLoadingRewrites && card.type === "original" && (
          <span className="italic text-[11px] text-gray-400">
            Generating rewrites…
          </span>
        )}
      </div>

      <p className="whitespace-pre-wrap">
        {card.text}
      </p>

      {isRewrite && (
        <>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVote("up")}
                disabled={pendingVote !== null}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100 disabled:opacity-50"
              >
                👍 <span>Upvote</span>
              </button>
              <button
                type="button"
                onClick={() => handleVote("down")}
                disabled={pendingVote !== null}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100 disabled:opacity-50"
              >
                👎 <span>Downvote</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span>Votes: {card.votes ?? 0}</span>
              <span>Replies: {card.replyCount ?? 0}</span>
            </div>
          </div>

          <form
            onSubmit={handleReplySubmit}
            className="mt-2 flex items-center gap-2"
          >
            <input
              type="text"
              className="flex-1 rounded-full border border-gray-300 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reply to this rewrite…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={submittingReply}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || submittingReply}
              className="rounded-full bg-black px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
