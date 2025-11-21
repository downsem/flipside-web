"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth, serverTimestamp } from "../firebase";
import { addDoc, collection } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function AddPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureAnonAuth() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser?.uid ?? null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setBusy(true);
      setError(null);

      const userId = await ensureAnonAuth();

      // Create the post
      const postsRef = collection(db, "posts");
      const postDocRef = await addDoc(postsRef, {
        text: text.trim(),
        authorId: userId ?? null,
        createdAt: serverTimestamp(),
      });

      // Generate all rewrites for this post
      await fetch("/api/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postDocRef.id,
          text: text.trim(),
        }),
      });

      setText("");
      router.push("/");
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Create a Flip</h1>
          <Link
            href="/"
            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-100"
          >
            Back to feed
          </Link>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            className="w-full min-h-[140px] rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What do you want to say?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Post Flip"}
          </button>
        </form>
      </div>
    </main>
  );
}
