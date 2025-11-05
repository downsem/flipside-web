"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db, auth, serverTimestamp } from "./firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import PostCard from "@/components/PostCard";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, type TimelineId } from "@/theme/timelines";
import type { ReplyArgs, VoteArgs } from "@/components/SwipeDeck";

type Post = {
  id: string;
  originalText: string;
  authorId?: string;
  createdAt?: any;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "https://flipside.fly.dev";

type FilterKind = "all" | TimelineId;

export default function PageClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKind>("all");

  const { setTimeline, theme } = useTheme();

  // Keep an anon auth session for Firestore writes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // fallback handled in firebase.ts, but keep here in case
      }
    });
    return () => unsub();
  }, []);

  // Sync page theme with filter automatically
  useEffect(() => {
    if (filter === "all") {
      setTimeline("calm"); // default theme when showing all
    } else {
      setTimeline(filter);
    }
  }, [filter, setTimeline]);

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
        console.error("Feed subscription failed:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const hasPosts = posts.length > 0;

  const pageBg = theme?.colors?.bg ?? "#f8fafc";
  const pageText = theme?.colors?.text ?? "#111";

  // Wire Vote -> /api/feedback
  const handleVote = (post: Post) => async (args: VoteArgs) => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flip_id: post.id,
          candidate_id: args.key, // "original" or lens key
          signal: args.value === "up" ? 1 : -1,
        }),
      });
    } catch (err) {
      console.error("feedback failed", err);
    }
  };

  // Wire Reply -> Firestore replies_original
  const handleReply = (post: Post) => async (args: ReplyArgs) => {
    try {
      const user = auth.currentUser;
      const authorId = user?.uid || "anon";
      await addDoc(collection(db, "posts", post.id, "replies_original"), {
        text: args.text,
        authorId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("reply failed", err);
    }
  };

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
            <div key={post.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <PostCard
                post={post}
                apiBase={API_BASE}
                filter={filter}
                onVote={handleVote(post)}
                onReply={handleReply(post)}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
