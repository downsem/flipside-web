"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  collection,
  deleteDoc,
  serverTimestamp,
  setDoc,
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

  useEffect(() => {
    async function fetchAuthor() {
      if (!post.authorId) return;
      const ref = doc(db, "users", post.authorId);
      const snap = await getDoc(ref);
      if (snap.exists()) setAuthor(snap.data());
    }
    fetchAuthor();
  }, [post.authorId]);

  async function recordLensStat(
    userId: string,
    timelineId: string,
    value: number
  ) {
    const statRef = doc(db, "users", userId, "lensStats", "default");
    const fieldName = `${timelineId}_${value > 0 ? "up" : "down"}`;

    await setDoc(
      statRef,
      {
        [fieldName]: increment(1),
      },
      { merge: true }
    );
  }

  async function handleVote(
    timelineId: "original" | TimelineId,
    value: number
  ) {
    if (!user) {
      alert("Sign in to vote.");
      return;
    }

    const targetRef =
      timelineId === "original"
        ? doc(db, "posts", post.id)
        : doc(db, "posts", post.id, "rewrites", timelineId);

    await updateDoc(targetRef, {
      votes: increment(value),
    });

    await recordLensStat(user.uid, timelineId, value);
  }

  async function handleReply(
    timelineId: "original" | TimelineId,
    text: string
  ) {
    if (!user) {
      alert("Sign in to reply.");
      return;
    }

    const path =
      timelineId === "original"
        ? collection(db, "posts", post.id, "replies")
        : collection(db, "posts", post.id, "rewrites", timelineId, "replies");

    await addDoc(path, {
      text,
      authorId: user.uid,
      createdAt: serverTimestamp(),
    });
  }

  async function handleDelete() {
    if (!user || user.uid !== post.authorId) return;

    if (!confirm("Delete this flip? This cannot be undone.")) return;

    await deleteDoc(doc(db, "posts", post.id));
  }

  async function handleShare() {
    const baseText = post.text || "";
    const shareText = `${baseText}\n\nSee this post through five lenses on Flipside.`;

    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          text: shareText,
          url: window.location.origin,
          title: "Flipside",
        });
        return;
      } catch (e) {
        console.error("Share cancelled or failed:", e);
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Copied flip text to clipboard. You can paste it anywhere to share.");
        return;
      } catch (e) {
        console.error("Clipboard failed:", e);
      }
    }

    alert(
      "Sharing is not supported in this browser. You can copy the text manually."
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {author ? (
            <img
              src={author.photoURL}
              alt="pfp"
              className="w-10 h-10 rounded-full border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
          )}

          <div className="flex flex-col leading-tight">
            <span className="font-medium text-sm">
              {author?.displayName || "Loading…"}
            </span>
            <span className="text-xs text-slate-500">
              {author?.email || ""}
            </span>
          </div>
        </div>

        {user?.uid === post.authorId && (
          <button
            onClick={handleDelete}
            className="text-xs text-red-600 underline"
          >
            Delete
          </button>
        )}
      </div>

      <div className="flex justify-end mb-2">
        <button
          onClick={handleShare}
          className="text-[11px] px-2 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Share
        </button>
      </div>

      <SwipeDeck
        post={post}
        selectedTimeline={selectedTimeline}
        onVote={handleVote}
        onReply={handleReply}
      />
    </div>
  );
}
