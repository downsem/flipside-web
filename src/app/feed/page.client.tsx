"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import PostCard from "@/components/PostCard";
import type { TimelineId } from "@/theme/timelines";

type Post = any;
type Filter = "all" | TimelineId;

export default function FeedPageClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const docs: Post[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setPosts(docs);
    });

    return () => unsub();
  }, []);

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
              See any post through five lenses.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-600">
            <span>Choose your timeline:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="all">All</option>
            <option value="calm">Calm</option>
            <option value="bridge">Bridge</option>
            <option value="cynical">Cynical</option>
            <option value="opposite">Opposite</option>
            <option value="playful">Playful</option>
          </select>

          {user ? (
            <Link href="/account">
              <img
                src={user.photoURL}
                alt="pfp"
                className="w-8 h-8 rounded-full border border-slate-200"
              />
            </Link>
          ) : (
            <Link
              href="/account"
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-medium"
            >
              Sign in
            </Link>
          )}

          <Link
            href={user ? "/add" : "/account"}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white shadow-sm"
          >
            Add Flip
          </Link>
        </div>
      </header>

      {/* Feed */}
      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-3">
        {posts.length === 0 && (
          <p className="text-xs text-slate-500 mt-4">
            No flips yet. Be the first to add one.
          </p>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} selectedTimeline={filter} />
        ))}
      </main>
    </div>
  );
}
