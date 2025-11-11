// src/app/add/page.client.tsx
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

const LENSES = ["calm", "bridge", "cynical", "opposite", "playful"] as const;

export default function AddFlipClient() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const t = text.trim();
    if (!t) return;

    try {
      setSaving(true);

      // 1) Make sure we have an anon user
      const user = auth.currentUser;
      if (!user) {
        alert("No auth session (even anonymous). Try reloading.");
        setSaving(false);
        return;
      }

      // 2) Create the post
      const created = await addDoc(collection(db, "posts"), {
        originalText: t,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });

      // 3) Call our API to generate 5 rewrites
      const res = await fetch("/api/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: t }),
      });
      const data = await res.json();
      if (!data?.ok || !data?.results) {
        console.error("generate-all failed:", data);
        alert("Flip saved, but rewrites failed to generate.");
      } else {
        const results: Record<(typeof LENSES)[number], string> = data.results;

        // 4) Save rewrites under posts/{postId}/rewrites/{lensId}
        await Promise.all(
          LENSES.map((lens) =>
            setDoc(
              doc(db, "posts", created.id, "rewrites", lens),
              { lens, text: results[lens] ?? "", createdAt: serverTimestamp() },
              { merge: false }
            )
          )
        );
      }

      // 5) Go back to the feed
      window.location.href = "/";
    } catch (err) {
      console.error("add flip error", err);
      alert("Failed to add flip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4">
        <Link href="/" className="text-sm underline">
          Back to feed
        </Link>
      </div>

      <h1 className="mb-3 text-2xl font-semibold">Add Flip</h1>

      <textarea
        className="w-full rounded-xl border p-3"
        rows={6}
        placeholder="Paste the original post text…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={saving || text.trim().length === 0}
          onClick={handleSave}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & Generate"}
        </button>
        <span className="text-xs text-gray-500">
          This will generate Calm, Bridge, Cynical, Opposite, and Playful rewrites.
        </span>
      </div>
    </div>
  );
}
