// src/app/add/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { db, auth, serverTimestamp } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
} from "firebase/firestore";

export default function AddPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);

    try {
      const uid = auth.currentUser?.uid ?? "anon";
      // 1) create the post
      const postsRef = collection(db, "posts");
      const postRef = await addDoc(postsRef, {
        originalText: text.trim(),
        authorId: uid,
        createdAt: serverTimestamp(),
      });

      // 2) request all lens rewrites
      const apiResp = await fetch("/api/generate-on-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: text.trim() }),
      });

      if (!apiResp.ok) {
        // We still keep the post; rewrites can be backfilled later with /api/generate-all
        const detail = await apiResp.text().catch(() => "");
        alert("Flip saved, but generating rewrites failed.");
        console.warn("generate-on-create failed:", detail);
      } else {
        const data = await apiResp.json();
        if (data?.ok && data?.candidates) {
          // 3) write each lens candidate under posts/{postId}/candidates/{lensId}
          const base = doc(db, "posts", postRef.id);
          const candColPath = `${base.path}/candidates`;
          await Promise.all(
            Object.entries<string>(data.candidates).map(([lensId, value]) =>
              setDoc(doc(collection(db, candColPath), lensId), {
                lens: lensId,
                text: value,
                createdAt: serverTimestamp(),
              })
            )
          );
        }
      }

      // 4) go back to feed
      window.location.href = "/";
    } catch (e) {
      console.error("add flip failed:", e);
      alert("Failed to add flip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <Link href="/" className="underline text-sm">
        Back to feed
      </Link>

      <h1 className="text-3xl font-bold mt-4 mb-4">Add Flip</h1>

      <textarea
        className="w-full min-h-[240px] rounded-xl border p-3"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type the original text…"
      />

      <div className="mt-4">
        <button
          disabled={saving || !text.trim()}
          onClick={handleSave}
          className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
