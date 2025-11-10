// src/app/add/page.client.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { db, auth, serverTimestamp } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function AddPageClient() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const body = text.trim();
    if (!body) return;

    try {
      setSaving(true);
      const uid = auth.currentUser?.uid || "anon";
      await addDoc(collection(db, "posts"), {
        originalText: body,
        authorId: uid,
        createdAt: serverTimestamp(),
      });
      setOk(true);
      setText("");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Flip</h1>
          <Link href="/" className="text-sm underline">
            ← Back to feed
          </Link>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            className="w-full rounded-xl border px-3 py-2"
            rows={6}
            placeholder="Write your flip (original post)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || text.trim().length === 0}
              className="rounded-xl bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Post"}
            </button>
            {ok && <span className="text-sm text-green-700">Saved!</span>}
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Tip: You’re signed in anonymously so you can post right away. We only store your UID
          for authorship (no personal info).
        </p>
      </div>
    </main>
  );
}
