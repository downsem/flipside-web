"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  orderBy,
  limit,
  query,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

// TODO: replace with your real admin email(s)
const ADMIN_EMAILS = ["ethanmdowns@gmail.com"];

type Metrics = {
  totalUsers: number;
  totalPosts: number;
  totalRewrites: number;
  totalReplies: number;
  totalVotes: number;
};

type TopPost = {
  id: string;
  text: string;
  votes: number;
  authorId: string;
};

export default function AdminDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
      } else {
        setIsAdmin(ADMIN_EMAILS.includes(u.email || ""));
      }
    });
  }, []);

  useEffect(() => {
    if (isAdmin === null) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        const usersRef = collection(db, "users");
        const usersSnap = await getCountFromServer(usersRef);
        const totalUsers = usersSnap.data().count;

        const postsRef = collection(db, "posts");
        const postsSnap = await getCountFromServer(postsRef);
        const totalPosts = postsSnap.data().count;

        const rewritesGroup = collectionGroup(db, "rewrites");
        const rewritesSnap = await getCountFromServer(rewritesGroup);
        const totalRewrites = rewritesSnap.data().count;

        const repliesGroup = collectionGroup(db, "replies");
        const repliesSnap = await getCountFromServer(repliesGroup);
        const totalReplies = repliesSnap.data().count;

        let totalVotes = 0;

        const postsVotesSnap = await getDocs(postsRef);
        postsVotesSnap.forEach((d) => {
          const data = d.data() as any;
          if (typeof data.votes === "number") {
            totalVotes += data.votes;
          }
        });

        const rewritesVotesSnap = await getDocs(rewritesGroup);
        rewritesVotesSnap.forEach((d) => {
          const data = d.data() as any;
          if (typeof data.votes === "number") {
            totalVotes += data.votes;
          }
        });

        setMetrics({
          totalUsers,
          totalPosts,
          totalRewrites,
          totalReplies,
          totalVotes,
        });

        const topPostsQ = query(
          postsRef,
          orderBy("votes", "desc"),
          limit(5)
        );
        const topPostsSnap = await getDocs(topPostsQ);
        const top: TopPost[] = [];
        topPostsSnap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          top.push({
            id: docSnap.id,
            text: data.text || "",
            votes: data.votes || 0,
            authorId: data.authorId || "",
          });
        });
        setTopPosts(top);
      } catch (err) {
        console.error("Error loading admin stats:", err);
        setError("Error loading stats. Check console for details.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [isAdmin]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/" className="mb-4 text-sm underline">
          ← Back to feed
        </Link>
        <h1 className="text-xl font-semibold mb-2">Admin Dashboard</h1>
        <p className="text-sm text-slate-600 mb-4 text-center max-w-sm">
          You must sign in to view admin stats.
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

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/" className="mb-4 text-sm underline">
          ← Back to feed
        </Link>
        <h1 className="text-xl font-semibold mb-2">Admin Dashboard</h1>
        <p className="text-sm text-slate-600 text-center max-w-sm">
          Your account does not have access to this page.
        </p>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-xl font-semibold mb-2">Admin Dashboard</h1>
        <p className="text-sm text-slate-600">Loading stats…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">
            Internal view of Flipside activity and usage.
          </p>
        </div>
        <Link href="/" className="text-xs underline text-slate-700">
          ← Back to feed
        </Link>
      </header>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Users" value={metrics.totalUsers} />
        <StatCard label="Total Posts" value={metrics.totalPosts} />
        <StatCard label="Total Rewrites" value={metrics.totalRewrites} />
        <StatCard label="Total Replies" value={metrics.totalReplies} />
        <StatCard label="Total Vote Sum" value={metrics.totalVotes} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Top Posts by Votes
        </h2>
        {topPosts.length === 0 && (
          <p className="text-xs text-slate-500">
            No posts yet or no votes recorded.
          </p>
        )}
        <div className="space-y-2">
          {topPosts.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate max-w-[70%]">
                  {p.text || "(no text)"}
                </span>
                <span className="ml-2 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px]">
                  {p.votes} votes
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Post ID: {p.id} · Author: {p.authorId}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
