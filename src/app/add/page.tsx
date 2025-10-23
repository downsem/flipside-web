// src/app/add/page.tsx
"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useState } from "react";
import Link from "next/link";
import { db, auth } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = text.trim().length > 0 && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setBusy(true);
      const user = auth.currentUser;
      const authorId = user?.uid || "anon";

      await addDoc(collection(db, "posts"), {
        originalText: text.trim(),
        filteredText: "", // legacy field (safe no-op)
        authorId,
        createdAt: serverTimestamp(),
      });

      setText("");
      alert("Added!");
    } catch (err) {
      console.error("add failed", err);
      alert("Failed to add. Check console.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Flip</h1>
        <Link href="/" className="underline text-sm">
          Back to feed
        </Link>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          className="w-full min-h-[140px] rounded-xl border p-3"
          placeholder="Paste the original post text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}
