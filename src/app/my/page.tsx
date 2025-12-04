"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import PostCard from "@/components/PostCard";
import type { TimelineId } from "@/theme/timelines";

type Post = any;
type Filter = "all" | TimelineId;

export default function MyFlipsPage() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter] = useState<Filter>("all");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs: Post[] = [];
      snap.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setPosts(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/" className="mb-4 text-sm underline">
          ← Back to feed
        </Link>
        <h1 className="text-xl font-semibold mb-2">My Flips</h1>
        <p className="text-sm text-slate-600 mb-4 text-center max-w-sm">
          Sign in to see the flips you&apos;ve created.
        </p>
        <Link
          href="/account"
          className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-sm"
        >
          Go to Account &amp; Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">My Flips</h1>
          <p className="text-xs text-slate-500">
            Only posts you&apos;ve created with this account.
          </p>
        </div>
        <Link href="/" className="text-xs underline text-slate-700">
          ← Back to feed
        </Link>
      </header>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && posts.length === 0 && (
        <p className="text-sm text-slate-500">
          You haven&apos;t created any flips yet.
        </p>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} selectedTimeline={filter} />
        ))}
      </div>
    </div>
  );
}
