// src/components/PostCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { TimelineId } from "@/theme/timelines";
import { getTimeline } from "@/theme/timelines";

import { db, auth, serverTimestamp } from "@/app/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

type CardType = "original" | "rewrite";

type Card = {
  id: string;
  type: CardType;
  timelineId?: TimelineId;
  label: string;
  text: string;
  votes?: number;
  replyCount?: number;
};

type PostCardProps = {
  postId: string;
  card: Card;
  isLoadingRewrites: boolean;
  cardIndex: number;
  totalCards: number;
};

type Reply = {
  id: string;
  text: string;
  authorId?: string | null;
  createdAt?: any;
};

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
  cardIndex,
  totalCards,
}: PostCardProps) {
  const [pendingVote, setPendingVote] = useState<"up" | "down" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);

  const timelineSpec = card.timelineId ? getTimeline(card.timelineId) : null;

  // Live replies thread for this card (original or rewrite)
  useEffect(() => {
    if (!card.id) return;

    let repliesCol;

    if (card.type === "rewrite") {
      repliesCol = collection(
        db,
        "posts",
        postId,
        "rewrites",
        card.id,
        "replies"
      );
    } else {
      repliesCol = collection(db, "posts", postId, "replies");
    }

    const q = query(repliesCol, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const rows: Reply[] = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          text: data.text ?? "",
          authorId: data.authorId ?? null,
          createdAt: data.createdAt ?? null,
        };
      });
      setReplies(rows);
    });

    return () => unsub();
  }, [postId, card.id, card.type]);

  async function handleVote(direction: "up" | "down") {
    if (!card.id) return;

    try {
      setPendingVote(direction);
      await ensureAnonAuth();

      let targetRef;
      if (card.type === "rewrite") {
        targetRef = doc(db, "posts", postId, "rewrites", card.id);
      } else {
        targetRef = doc(db, "posts", postId);
      }

      await updateDoc(targetRef, {
        votes: increment(direction === "up" ? 1 : -1),
      });
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setPendingVote(null);
    }
  }

  async function handleReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!card.id || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const userId = await ensureAnonAuth();

      let repliesCol;
      let parentRef;

      if (card.type === "rewrite") {
        repliesCol = collection(
          db,
          "posts",
          postId,
          "rewrites",
          card.id,
          "replies"
        );
        parentRef = doc(db, "posts", postId, "rewrites", card.id);
      } else {
        repliesCol = collection(db, "posts", postId, "replies");
        parentRef = doc(db, "posts", postId);
      }

      const replyRef = doc(repliesCol);

      await setDoc(replyRef, {
        id: replyRef.id,
        postId,
        rewriteId: card.type === "rewrite" ? card.id : null,
        text: replyText.trim(),
        authorId: userId,
        createdAt: serverTimestamp(),
      });

      await updateDoc(parentRef, {
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
    <div className="space-y-3 text-sm leading-relaxed text-slate-900">
      {/* Top row: label + counter + loading hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          {timelineSpec?.icon && <span>{timelineSpec.icon}</span>}
          <span>{card.label}</span>
        </span>
        <span className="flex items-center gap-2">
          {card.type === "original" && isLoadingRewrites && (
            <span className="italic text-[10px] text-slate-400">
              Generating rewrites…
            </span>
          )}
          <span className="tabular-nums">
            {cardIndex} / {totalCards}
          </span>
        </span>
      </div>

      {/* Main text */}
      <p className="whitespace-pre-wrap text-[13px] text-slate-900">
        {card.text}
      </p>

      {/* Replies list */}
      {replies.length > 0 && (
        <div className="mt-1 space-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-700">
          {replies.map((r) => (
            <p key={r.id} className="flex gap-1">
              <span className="font-semibold text-slate-600">Anon:</span>
              <span>{r.text}</span>
            </p>
          ))}
        </div>
      )}

      {/* Voting + reply UI */}
      <div className="flex flex-col gap-2 pt-1 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVote("up")}
              disabled={pendingVote !== null}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              👍 <span>Upvote</span>
            </button>
            <button
              type="button"
              onClick={() => handleVote("down")}
              disabled={pendingVote !== null}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              👎 <span>Downvote</span>
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Votes: {card.votes ?? 0}</span>
            <span>Replies: {card.replyCount ?? 0}</span>
          </div>
        </div>

        <form
          onSubmit={handleReplySubmit}
          className="mt-1 flex items-center gap-2"
        >
          <input
            type="text"
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={submittingReply}
          />
          <button
            type="submit"
            disabled={!replyText.trim() || submittingReply}
            className="rounded-2xl bg-slate-700 px-4 py-2 text-[11px] font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
