// src/app/feed/page.client.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import PostCard from "@/components/PostCard";
import type { TimelineId } from "@/theme/timelines";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Post = any;
type Filter = "all" | TimelineId;

export default function FeedPageClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    setLoading(true);
    setErr(null);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: Post[] = [];
        snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
        setPosts(docs);
        setLoading(false);
      },
      (e) => {
        console.error("[feed] snapshot error", e);
        setErr("Couldn’t load the feed. Please try again.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const hasPhoto = !!user?.photoURL;

  function PostCardSkeleton() {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-6 h-10 w-40 rounded-[var(--radius-pill)]" />
      </Card>
    );
  }

  return (
    <AppShell
      title="Feed"
      headerRight={
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-[var(--radius-pill)] border border-neutral-200 bg-white px-3 py-2 text-[var(--text-sm)]"
            aria-label="Timeline filter"
          >
            <option value="all">All</option>
            <option value="calm">Calm</option>
            <option value="bridge">Bridge</option>
            <option value="cynical">Cynical</option>
            <option value="opposite">Opposite</option>
            <option value="playful">Playful</option>
          </select>

          <Link href="/account" className="inline-flex">
            {user ? (
              hasPhoto ? (
                <img
                  src={user.photoURL}
                  alt="profile"
                  className="h-9 w-9 rounded-full border border-neutral-200"
                />
              ) : (
                <div className="h-9 w-9 rounded-full border border-neutral-200 bg-neutral-100" />
              )
            ) : (
              <div className="h-9 w-9 rounded-full border border-neutral-200 bg-neutral-100" />
            )}
          </Link>
        </div>
      }
    >
      {err && (
        <ErrorState
          description={err}
          onRetry={() => {
            // simplest retry: reload page
            window.location.reload();
          }}
        />
      )}

      {!err && loading && (
        <div className="space-y-3">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {!err && !loading && posts.length === 0 && (
        <EmptyState
          title="No flips yet"
          description="Be the first to add one."
          ctaLabel="Create a flip"
          onCta={() => (window.location.href = "/")}
        />
      )}

      {!err && !loading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} selectedTimeline={filter} />
          ))}
        </div>
      )}
    </AppShell>
  );
}