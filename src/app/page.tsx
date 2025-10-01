// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "./firebase"; // adjust the path if your firebase file lives elsewhere
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  Timestamp,
} from "firebase/firestore";
import PostCard from "../components/PostCard";

type Post = {
  id: string;
  originalText: string;
  authorId: string;
  createdAt?: Timestamp | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://flipside.fly.dev";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">FlipSide</h1>
        <Link
          href="/add"
          className="rounded-2xl bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
        >
          Add Flip
        </Link>
      </header>

      {/* Feed */}
      {loading && (
        <div className="text-gray-500 text-sm">Loading feed…</div>
      )}

      {!loading && !hasPosts && (
        <div className="text-gray-500 text-sm">
          No posts yet. Be the first to{" "}
          <Link href="/add" className="underline">
            add one
          </Link>
          !
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} apiBase={API_BASE} />
        ))}
      </div>
    </main>
  );
}
