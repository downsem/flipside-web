export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { db, auth, serverTimestamp } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { TIMELINES } from "@/theme/timelines";

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Ensure anon user (safety if the firebase.ts listener hasn't fired yet)
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setBusy(true);
    setStatus("Posting…");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("no_auth_user");
      }

      // 1) Create the post
      const postRef = await addDoc(collection(db, "posts"), {
        originalText: text.trim(),
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });

      setStatus("Generating rewrites…");

      // 2) Ask server to generate all 5 lens candidates
      const resp = await fetch("/api/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: text.trim() }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        console.warn("batch-generate failed:", data);
        // We still keep the original post; user can trigger generation later if needed
      }

      // 3) Write candidates we got back under /posts/{postId}/candidates/{lensId}
      const candidates: Record<string, string> = data?.candidates ?? {};
      const writes: Promise<unknown>[] = [];

      Object.values(TIMELINES).forEach((t) => {
        const lensId = t.id;
        const txt = candidates[lensId];
        if (!txt) return; // skip failed lens

        const candRef = doc(db, `posts/${postRef.id}/candidates/${lensId}`);
        writes.push(
          setDoc(candRef, {
            text: txt,
            lens: lensId,
            authorId: user.uid, // same author; rules check
            createdAt: serverTimestamp(),
          })
        );
      });

      if (writes.length) {
        await Promise.all(writes);
      }

      setStatus("Done!");
      setText("");
    } catch (err) {
      console.error("add submit failed:", err);
      setStatus("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-2xl p-4">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Flip</h1>
          <Link href="/" className="text-sm underline">
            Back to feed
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full rounded-xl border p-3"
            rows={5}
            placeholder="Write your flip…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post Flip"}
            </button>
            {status && <span className="text-sm text-gray-600">{status}</span>}
          </div>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          We’ll generate the 5 rewrites (calm, bridge, cynical, opposite, playful) right after you
          post, so they’re ready when people view your flip.
        </p>
      </div>
    </main>
  );
}
