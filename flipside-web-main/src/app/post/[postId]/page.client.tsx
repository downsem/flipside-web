// src/app/post/[postId]/page.client.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/app/firebase";
import PostCard from "@/components/PostCard";

type Post = any;

export default function PostPageClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const ref = doc(db, "posts", postId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPost(null);
          setLoading(false);
          return;
        }
        setPost({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (err) => {
        console.error("Error loading post:", err);
        setPost(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [postId]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            FS
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Flipside
            </span>
            <span className="text-[10px] text-slate-500">
              Full deck view
            </span>
          </div>
        </div>

        <Link
          href="/feed"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm"
        >
          Back to feed
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        {loading && (
          <p className="text-xs text-slate-500 mt-4">Loading…</p>
        )}

        {!loading && !post && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">
              This flip doesn’t exist (or was deleted).
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try heading back to the feed.
            </p>
            <div className="mt-3">
              <Link
                href="/feed"
                className="text-xs underline text-slate-800"
              >
                Back to feed
              </Link>
            </div>
          </div>
        )}

        {!loading && post && (
          <PostCard post={post} selectedTimeline="all" />
        )}
      </main>
    </div>
  );
}
