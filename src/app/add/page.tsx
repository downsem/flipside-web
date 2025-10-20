// src/app/add/page.tsx
"use client";

import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

export default function AddFlipPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setOk(null);
    try {
      await addDoc(collection(db, "posts"), {
        originalText: text.trim(),
        authorId: "anon",
        createdAt: serverTimestamp(),
      });
      setText("");
      setOk("Saved! It will appear in the feed shortly.");
    } catch (e) {
      setOk("Failed to save. Try again.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Add Flip</h1>
        <Link href="/" className="underline text-sm">
          Back to feed
        </Link>
      </header>

      <textarea
        className="w-full min-h-[180px] rounded-2xl border px-3 py-2"
        placeholder="Paste or type the original post…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex justify-end">
        <button
          className="rounded-2xl bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={submit}
          disabled={busy || !text.trim()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {ok && <p className="mt-3 text-sm text-gray-600">{ok}</p>}
    </main>
  );
}
