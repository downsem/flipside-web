// src/app/page.client.tsx
"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import SwipeDeck from "@/components/SwipeDeck";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";

type Post = {
  id: string;
  text: string;
  authorId?: string | null;
  createdAt?: any;
  votes?: number;
  replyCount?: number;
};

type FilterValue = "all" | TimelineId;

export default function HomePageClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const rows: Post[] = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          text: data.text ?? "",
          authorId: data.authorId ?? null,
          createdAt: data.createdAt ?? null,
          votes: data.votes ?? 0,
          replyCount: data.replyCount ?? 0,
        };
      });
      setPosts(rows);
    });

    return () => unsub();
  }, []);

  function handleFilterChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as FilterValue;
    setFilter(value);
  }

  // ✅ Only show posts that actually have text (no blank cards)
  const nonEmptyPosts = posts.filter(
    (p) => p.text && p.text.trim().length > 0
  );

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        {/* Header: FlipSide (left) | Choose your timeline + filter + Add Flip (right) */}
        <header className="flex items-center justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight">FlipSide</div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-700">
              Choose your timeline
            </span>

            <div className="relative inline-flex">
              <select
                value={filter}
                onChange={handleFilterChange}
                className="appearance-none rounded-full border border-slate-300 bg-white px-3 pr-7 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">Default (All)</option>
                {TIMELINE_LIST.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-500">
                ▾
              </span>
            </div>

            <Link
              href="/add"
              className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-xs font-medium text-white shadow-sm"
            >
              Add Flip
            </Link>
          </div>
        </header>

        {nonEmptyPosts.length === 0 ? (
          <p className="text-sm text-slate-600">
            No flips yet. Paste something spicy and see how the lenses respond.
          </p>
        ) : (
          <div className="space-y-4 pb-8">
            {nonEmptyPosts.map((post) => (
              <SwipeDeck
                key={post.id}
                post={post}
                activeTimelineFilter={filter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
