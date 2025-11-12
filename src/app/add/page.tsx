// src/app/add/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth, serverTimestamp } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setBusy(true);
      const user = auth.currentUser;
      if (!user) {
        alert("Not signed in (anon). Please refresh and try again.");
        setBusy(false);
        return;
      }

      // 1) Create the post immediately
      const ref = await addDoc(collection(db, "posts"), {
        originalText: text.trim(),
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });

      // 2) Fire-and-forget: ask server to generate 5 rewrites, then write them as candidates
      (async () => {
        try {
          const api = "/api/generate-on-create";
          const resp = await fetch(api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ original: text.trim() }),
          });
          const data = await resp.json();
          if (data?.ok && data?.rewrites) {
            const entries = Object.entries(data.rewrites) as Array<[string, string]>;
            await Promise.all(
              entries.map(([lens, rewrite]) =>
                setDoc(
                  doc(db, "posts", ref.id, "candidates", lens),
                  { text: rewrite, createdAt: serverTimestamp() },
                  { merge: true }
                )
              )
            );
          }
        } catch (err) {
          console.error("background generation failed:", err);
        }
      })();

      // 3) Bounce back to feed immediately
      router.push("/");
    } catch (err) {
      console.error("Add flip failed:", err);
      alert("Failed to add. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add Flip</h1>
          <Link className="underline" href="/">Back</Link>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            className="w-full rounded-xl border p-3"
            rows={5}
            placeholder="What's on your mind?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            className="rounded-2xl bg-black text-white px-4 py-2 disabled:opacity-50"
            disabled={busy || text.trim().length === 0}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </form>
      </div>
    </main>
  );
}
