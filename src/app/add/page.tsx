// src/app/add/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth, serverTimestamp } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function ensureAnonAuth() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser?.uid ?? null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    setError(null);

    try {
      const userId = await ensureAnonAuth();

      // Create post document
      const postsCol = collection(db, "posts");
      const postRef = doc(postsCol);

      await setDoc(postRef, {
        id: postRef.id,
        text: text.trim(),
        authorId: userId,
        createdAt: serverTimestamp(),
        votes: 0,
        replyCount: 0,
      });

      // Trigger rewrite generation
      const res = await fetch("/api/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postRef.id,
          text: text.trim(),
        }),
      });

      if (!res.ok) {
        console.error("Error generating rewrites", await res.text());
        setError("Something went wrong creating your flip. Please try again.");
        setBusy(false);
        return;
      }

      // Back to feed
      router.push("/");
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Add Flip</h1>
          <Link
            href="/"
            className="text-sm font-medium text-slate-800 underline"
          >
            Back to feed
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <textarea
              className="h-40 w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Paste the original post text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-700 px-6 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
