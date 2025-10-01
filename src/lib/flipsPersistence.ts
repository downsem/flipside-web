// src/lib/flipsPersistence.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../app/firebase"; // <-- relative path, no alias

export async function saveFlipVote(opts: {
  postId: string;
  flipIndex: number;
  promptKey: string;
  direction: "up" | "down" | null;
  text: string;             // the flip text the user voted on
  userId?: string;          // optional override
}) {
  const uid = opts.userId || auth.currentUser?.uid || "anon";
  const col = collection(db, "posts", opts.postId, "flip_votes"); // <- matches rules

  await addDoc(col, {
    flipIndex: opts.flipIndex,
    promptKey: opts.promptKey,
    direction: opts.direction,
    text: opts.text,
    userId: uid,
    createdAt: serverTimestamp(),
  });
}

export async function saveFlipReply(opts: {
  postId: string;
  flipIndex: number;
  promptKey: string;
  text: string;            // the flip text being replied to
  replyBody: string;       // the user's reply
  userId?: string;
}) {
  const uid = opts.userId || auth.currentUser?.uid || "anon";
  const col = collection(db, "posts", opts.postId, "flip_replies"); // <- matches rules

  await addDoc(col, {
    flipIndex: opts.flipIndex,
    promptKey: opts.promptKey,
    text: opts.text,
    replyBody: opts.replyBody,
    userId: uid,
    createdAt: serverTimestamp(),
  });
}
