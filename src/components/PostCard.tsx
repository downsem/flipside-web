// src/components/PostCard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "@/app/firebase";
import SwipeDeck from "./SwipeDeck";
import type { TimelineId } from "@/theme/timelines";

type PostCardProps = {
  post: any;
  selectedTimeline: "all" | TimelineId;
};

export default function PostCard({ post, selectedTimeline }: PostCardProps) {
  const [author, setAuthor] = useState<any>(null);
  const user = auth.currentUser;

  const isAnonPost = !!post?.authorIsAnonymous || !post?.authorId;

  useEffect(() => {
    async function fetchAuthor() {
      if (!post.authorId) return;

      // If the post is anonymous, it likely won't have a user profile doc anyway
      if (post.authorIsAnonymous) return;

      const ref = doc(db, "users", post.authorId);
      const snap = await getDoc(ref);
      if (snap.exists()) setAuthor(snap.data());
    }
    fetchAuthor();
  }, [post.authorId, post.authorIsAnonymous]);

  async function handleDelete() {
    if (!user || user.uid !== post.authorId) return;
    if (!confirm("Delete this flip? This cannot be undone.")) return;
    await deleteDoc(doc(db, "posts", post.id));
  }

  const displayName = author?.displayName || (isAnonPost ? "Guest" : "Loading…");
  const subline = author?.email || "";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {author?.photoURL ? (
            <img
              src={author.photoURL}
              alt="pfp"
              className="w-10 h-10 rounded-full border"
            />
          ) : isAnonPost ? (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
              G
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
          )}

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{displayName}</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {post?.flipType === "people" ? "People" : "AI"}
              </span>
            </div>
            <span className="text-xs text-slate-500">{subline}</span>
          </div>
        </div>

        {user?.uid === post.authorId && (
          <button onClick={handleDelete} className="text-xs text-red-600 underline">
            Delete
          </button>
        )}
      </div>

      <SwipeDeck
        post={post}
        selectedTimeline={selectedTimeline}
      />
    </div>
  );
}