// src/components/PostCard.tsx
"use client";

import React from "react";
import SwipeDeck from "./SwipeDeck";

// type-only imports
import type { TimelineId } from "@/theme/timelines";
import type { Flip, VoteArgs, ReplyArgs } from "./SwipeDeck";

import { db, auth, serverTimestamp } from "@/app/firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";

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
  onVote?: (args: VoteArgs) => void | Promise<void>;
  onReply?: (args: ReplyArgs) => void | Promise<void>;
};

export default function PostCard({
  post,
  apiBase,
  filter,
  onVote,
  onReply,
}: Props) {
  // Construct the initial flip structure for SwipeDeck
  const initialFlips: Flip[] = [
    {
      flip_id: post.id,
      original: post.originalText,
      candidates: [],
    },
  ];

  // Default Firestore-backed handlers (used if parent doesn’t pass custom ones)
  const defaultVote = async ({ value }: VoteArgs) => {
    const u = auth.currentUser;
    if (!u) {
      alert("Not signed in; refresh to re-establish anon session.");
      return;
    }
    const ref = doc(db, "posts", post.id, "votes", u.uid);
    await setDoc(ref, { signal: value, createdAt: serverTimestamp() }, { merge: true });
  };

  const defaultReply = async ({ text }: ReplyArgs) => {
    const u = auth.currentUser;
    if (!u) {
      alert("Not signed in; refresh to re-establish anon session.");
      return;
    }
    const coll = collection(db, "posts", post.id, "replies");
    await addDoc(coll, { text, authorId: u.uid, createdAt: serverTimestamp() });
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <SwipeDeck
        initialFlips={initialFlips}
        apiBase={apiBase}
        filterPrompt={filter}
        onVote={onVote ?? defaultVote}
        onReply={onReply ?? defaultReply}
      />
    </div>
  );
}
