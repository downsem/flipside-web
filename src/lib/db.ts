// src/lib/db.ts
import { db, serverTimestamp } from "@/app/firebase";
import {
  collection,
  addDoc,
  setDoc,
  doc,
} from "firebase/firestore";

export type SavedFlip = {
  id: string;
  promptKind: string;
  text: string;
  order: number;
};

export async function saveFlipsBatch(postId: string, flips: Array<{promptKind: string; text: string}>) {
  const flipsCol = collection(db, "posts", postId, "flips");
  const saved: SavedFlip[] = [];
  let order = 0;
  for (const f of flips) {
    const ref = await addDoc(flipsCol, {
      promptKind: f.promptKind,
      text: f.text,
      order,
      createdAt: serverTimestamp(),
    });
    saved.push({ id: ref.id, promptKind: f.promptKind, text: f.text, order });
    order += 1;
  }
  return saved;
}

export async function recordVote(postId: string, flipId: string, userId: string, value: "up" | "down") {
  const voteRef = doc(db, "posts", postId, "flips", flipId, "votes", userId);
  await setDoc(voteRef, {
    value,
    createdAt: serverTimestamp(),
  });
}

export async function addReply(postId: string, flipId: string, userId: string, text: string) {
  const repliesCol = collection(db, "posts", postId, "flips", flipId, "replies");
  await addDoc(repliesCol, {
    userId,
    text,
    createdAt: serverTimestamp(),
  });
}
