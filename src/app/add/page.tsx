// src/app/add/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function AddPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    const originalText = text.trim();
    if (!originalText) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "posts"), {
        originalText,
        authorId: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      router.push("/");
    } catch (e) {
      console.error("add post failed:", e);
      alert("Failed to add. Check console.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg,#e6f0ff)] text-[var(--text,#111)]">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Add Flip</h1>
          <Link href="/" className="underline">
            Back to feed
          </Link>
        </header>

        <textarea
          className="w-full min-h-[140px] rounded-xl border p-3"
          placeholder="Paste the original post text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-3">
          <button
            onClick={save}
            disabled={saving || text.trim().length === 0}
            className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}
