// src/app/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";

import PostCard from "@/components/PostCard";
import { useTheme } from "@/context/ThemeContext";
import { TIMELINES, type TimelineId } from "@/theme/timelines";

type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: Timestamp | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://flipside.fly.dev";

type FilterKind = "all" | TimelineId;

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const { timelineId, setTimeline, theme } = useTheme();
  const [filter, setFilter] = useState<FilterKind>("all");

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

  const hasPosts = posts.length > 0;

  const pageBg = theme?.colors?.bg ?? "#f8fafc";
  const pageText = theme?.colors?.text ?? "#111";

  return (
    <main className="min-h-screen" style={{ background: pageBg, color: pageText }}>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
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

            {filter !== "all" && filter !== timelineId ? (
              <button
                className="text-xs underline"
                onClick={() => setTimeline(filter as TimelineId)}
                title="Match page theme to this lens"
              >
                Match theme
              </button>
            ) : null}
          </div>
        </header>

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
            <PostCard key={post.id} post={post} apiBase={API_BASE} filter={filter} />
          ))}
        </div>
      </div>
    </main>
  );
}
