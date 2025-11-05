// src/app/page.client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, addDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

import PostCard from "@/components/PostCard";
import { TIMELINE_LIST, type TimelineId } from "@/theme/timelines";
import type { ReplyArgs, VoteArgs } from "@/components/SwipeDeck";

type PostDoc = {
  id: string;
  originalText: string;
  authorId?: string;
  createdAt?: any;
};

export default function PageClient() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [filter, setFilter] = useState<"all" | TimelineId>("all");
  const apiBase = ""; // not used on client for votes/replies

  // Ensure anonymous sign-in before any writes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("anon sign-in failed:", e);
        }
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to posts
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: PostDoc[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setPosts(arr);
    });
    return () => unsub();
  }, []);

  // Handlers wired to Firestore with the new rules/paths

  async function handleVote(postId: string, args: VoteArgs) {
    try {
      // be sure we have a user
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser!.uid;

      // deterministic one-doc-per-user-per-key
      const voteId = `${uid}_${args.key}`;
      await setDoc(
        doc(db, `posts/${postId}/votes/${voteId}`),
        {
          userId: uid,
          key: args.key,               // 'original' | TimelineId
          signal: args.value,          // 'up' | 'down'
          createdAt: serverTimestamp()
        },
        { merge: true } // allow toggling/updating
      );
    } catch (err) {
      console.error("save vote failed:", err);
      alert("Could not save vote.");
    }
  }

  async function handleReply(postId: string, args: ReplyArgs) {
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser!.uid;

      await addDoc(collection(db, `posts/${postId}/replies`), {
        authorId: uid,
        key: args.key,          // 'original' | TimelineId
        text: args.text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("save reply failed:", err);
      alert("Could not post reply.");
    }
  }

  const options = useMemo(
    () =>
      [
        { id: "all", label: "Default (All)" },
        ...TIMELINE_LIST.map((t) => ({ id: t.id, label: t.label })),
      ] as Array<{ id: "all" | TimelineId; label: string }>,
    []
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <a
          href="/add"
          className="px-4 py-2 rounded-xl bg-black text-white text-sm"
        >
          Add Flip
        </a>

        <label className="inline-flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter</span>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-6">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={{ id: p.id, originalText: p.originalText, authorId: p.authorId }}
            apiBase={apiBase}
            filter={filter}
            onVote={(args) => handleVote(p.id, args)}
            onReply={(args) => handleReply(p.id, args)}
          />
        ))}
        {posts.length === 0 && (
          <div className="text-center text-gray-500">Nothing yet — add a flip!</div>
        )}
      </div>
    </div>
  );
}
