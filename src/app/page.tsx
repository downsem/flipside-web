// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db, auth } from "./firebase";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import PostCard from "@/components/PostCard";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, type TimelineId } from "@/theme/timelines";
import type { FilterKind } from "@/components/PostCard";

type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: any;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // theme + filter
  const { timelineId, setTimeline, theme } = useTheme();
  const [filter, setFilter] = useState<FilterKind>("all");

  // keep theme in sync with filter (when not "all")
  useEffect(() => {
    if (filter !== "all" && filter !== timelineId) {
      setTimeline(filter as TimelineId);
    }
  }, [filter, timelineId, setTimeline]);

  // subscribe to recent posts
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
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
        console.error("feed subscription failed:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const pageBg = theme?.colors?.bg ?? "#f8fafc";
  const pageText = theme?.colors?.text ?? "#111";

  // Handlers: persist vote & reply
  async function handleVote(args: {
    postId: string;
    candidateId: string;
    signal: "up" | "down";
  }) {
    try {
      await addDoc(collection(db, "posts", args.postId, "votes"), {
        candidateId: args.candidateId,
        signal: args.signal,
        userId: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("save vote failed:", e);
      alert("Could not save vote.");
    }
  }

  async function handleReply(args: { postId: string; target: string; text: string }) {
    try {
      await addDoc(collection(db, "posts", args.postId, "replies"), {
        text: args.text,
        target: args.target, // "original" or lens key
        authorId: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("save reply failed:", e);
      alert("Could not post reply.");
    }
  }

  const hasPosts = posts.length > 0;

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
              className="rounded-xl border px-3 py-2 text-sm bg-white text-black"
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
        {loading && <div className="text-gray-700 text-sm">Loading feed…</div>}

        {!loading && !hasPosts && (
          <div className="text-gray-700 text-sm">
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
              onVote={({ key, value }) =>
                handleVote({
                  postId: post.id,
                  candidateId: (key as string) ?? "original",
                  signal: value,
                })
              }
              onReply={({ key, text }) =>
                handleReply({
                  postId: post.id,
                  target: (key as string) ?? "original",
                  text,
                })
              }
            />
          ))}
        </div>
      </div>
    </main>
  );
}
