// src/components/PostCard.tsx
"use client";

import React from "react";
import SwipeDeck from "./SwipeDeck";
import type { TimelineId } from "@/theme/timelines";
import type { Flip, VoteArgs, ReplyArgs } from "./SwipeDeck";

import { db, auth, serverTimestamp } from "@/app/firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

type Post = {
  id: string;
  originalText: string;
  authorId?: string;
};

export type FilterKind = "all" | TimelineId;

type Props = {
  post: Post;
  apiBase: string;
  filter: FilterKind;
};

export default function PostCard({ post, apiBase, filter }: Props) {
  const initialFlips: Flip[] = [
    { flip_id: post.id, original: post.originalText, candidates: [] },
  ];

  async function handleVote({ key, value }: VoteArgs) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("no_auth");

      // one vote doc per user per post
      await setDoc(
        doc(db, "posts", post.id, "votes", user.uid),
        {
          signal: value,                          // "up" | "down"
          lens: key === "original" ? "original" : key,
          createdAt: serverTimestamp(),
        },
        { merge: false }
      );
    } catch (err) {
      console.error("save vote failed:", err);
      alert("Could not save vote.");
    }
  }

  async function handleReply({ key, text }: ReplyArgs) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("no_auth");

      await addDoc(collection(db, "posts", post.id, "replies"), {
        text,
        lens: key === "original" ? "original" : key,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("save reply failed:", err);
      alert("Could not post reply.");
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <SwipeDeck
        initialFlips={initialFlips}
        apiBase={apiBase}
        filterPrompt={filter}
        onVote={handleVote}
        onReply={handleReply}
      />
    </div>
  );
}
