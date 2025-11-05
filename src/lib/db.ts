// src/lib/db.ts
import { db, serverTimestamp } from "@/app/firebase";
import {
  collection,
  addDoc,
  setDoc,
  doc,
} from "firebase/firestore";

/** Votes are stored 1-per-user per lens under posts/{postId}/votes/{userId}_{lens} */
export async function recordVote(params: {
  postId: string;
  userId: string;
  lens: string;               // "original" | TimelineId
  value: "up" | "down";
  text: string;               // the text being voted on (for audit)
}) {
  const key = `${params.userId}_${params.lens}`;
  const ref = doc(db, "posts", params.postId, "votes", key);
  await setDoc(ref, {
    value: params.value,
    lens: params.lens,
    text: params.text,
    userId: params.userId,
    createdAt: serverTimestamp(),
  });
}

/** Replies go to posts/{postId}/replies (flat list) */
export async function addReply(params: {
  postId: string;
  userId: string;
  lens: string;               // "original" | TimelineId
  text: string;               // the reply content
  flipText: string;           // the text being replied to (for audit)
}) {
  const col = collection(db, "posts", params.postId, "replies");
  await addDoc(col, {
    userId: params.userId,
    lens: params.lens,
    text: params.text,
    flipText: params.flipText,
    createdAt: serverTimestamp(),
  });
}
