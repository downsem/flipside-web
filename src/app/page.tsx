// src/app/page.tsx
"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useEffect, useState } from "react";
import Link from "next/link";

import { db, auth, serverTimestamp } from "./firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  Timestamp,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

import PostCard, { type FilterKind } from "@/components/PostCard";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, type TimelineId } from "@/theme/timelines";
import { signInAnonymously } from "firebase/auth";

// -------- Types --------
type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: Timestamp | null;
};

// Your API base (only used by SwipeDeck when it has to call /api/flip)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "";

// ---------------------------------------

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme + filter
  const { timelineId, setTimeline, theme } = useTheme();
  const [filter, setFilter] = useState<FilterKind>("all");

  // Feed subscription
  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Post[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            originalText: data.originalText || "",
            authorId: data.authorId || "",
            createdAt: data.createdAt ?? null,
          };
        });
        setPosts(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Feed subscription failed:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Keep page theme synced to filter (no more "Match theme" button)
  useEffect(() => {
    if (filter !== "all" && filter !== timelineId) {
      setTimeline(filter as TimelineId);
    }
  }, [filter, timelineId, setTimeline]);

  // Ensure we always have an anon user before any write
  const ensureUser = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth).catch((e) =>
        console.error("anon sign-in failed:", e)
      );
    }
    return auth.currentUser;
  };

  // Votes: original => likes_original; lenses => votes collection
  const makeOnVote = (postId: string) => {
    return async (args: {
      index: number;
      key: TimelineId | "original";
      value: "up" | "down";
      text: string;
    }) => {
      const user = await ensureUser();
      if (!user) return;

      try {
        if (args.key === "original") {
          const likeRef = doc(db, "posts", postId, "likes_original", user.uid);
          if (args.value === "up") {
            await setDoc(likeRef, { createdAt: serverTimestamp() });
          } else {
            await deleteDoc(likeRef).catch(() => {});
          }
        } else {
          await addDoc(collection(db, "posts", postId, "votes"), {
            userId: user.uid,
            candidateId: args.key,
            signal: args.value, // "up" | "down"
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error("vote write failed:", err);
      }
    };
  };

  // Replies: original => replies_original; lenses => replies
  const makeOnReply = (postId: string) => {
    return async (args: {
      index: number;
      key: TimelineId | "original";
      text: string;
      flipText: string;
    }) => {
      const user = await ensureUser();
      if (!user) return;

      try {
        if (args.key === "original") {
          await addDoc(collection(db, "posts", postId, "replies_original"), {
            text: args.text,
            authorId: user.uid,
            createdAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "posts", postId, "replies"), {
            text: args.text,
            authorId: user.uid,
            candidateId: args.key,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error("reply write failed:", err);
      }
    };
  };

  const hasPosts = posts.length > 0;
  const pageBg = theme?.colors?.bg ?? "#f8fafc";
  const pageText = theme?.colors?.text ?? "#111";

  return (
    <main className="min-h-screen" style={{ background: pageBg, color: pageText }}>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">FlipSide</h1>

          <div className="flex items-center gap-2">
            <Link
              href="/add"
              className="rounded-2xl bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
            >
              Add Flip
            </Link>

            <label htmlFor="feed-filter" className="sr-only">
              Filter flips
            </label>
            <select
              id="feed-filter"
              className="rounded-xl border px-3 py-2 text-sm bg-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKind)}
            >
              <option value="all">Default (All)</option>
              {Object.values(TIMELINES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Feed */}
        {loading && <div className="text-gray-600 text-sm">Loading feed…</div>}

        {!loading && !hasPosts && (
          <div className="text-gray-600 text-sm">
            No posts yet. Be the first to{" "}
            <Link href="/add" className="underline">
              add one
            </Link>
            !
          </div>
        )}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              apiBase={API_BASE}
              filter={filter}
              onVote={makeOnVote(post.id)}
              onReply={makeOnReply(post.id)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
