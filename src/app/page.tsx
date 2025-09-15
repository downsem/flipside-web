"use client";
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import FlipCard, { type FlipPost } from "../components/FlipCard";

export default function HomePage() {
  const [posts, setPosts] = useState<FlipPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: FlipPost[] = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...(doc.data() as any) }));
        setPosts(arr);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">FlipSide</h1>
        <a href="/add" className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800">
          Add Flip
        </a>
      </header>

      {loading && <div className="text-gray-500">Loading feed...</div>}
      {error && <div className="text-red-600 p-4 border border-red-200 rounded-lg"><strong>Error:</strong> {error}</div>}

      {!loading && !error && posts.length === 0 && (
        <div className="text-gray-500 text-center py-10">No posts yet. Be the first to add one!</div>
      )}

      {posts.map((p) => (<FlipCard key={p.id} post={p} />))}
    </main>
  );
}
