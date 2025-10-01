"use client";
import React from "react";
import SwipeDeck from "./SwipeDeck";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../app/firebase"; // adjust path if yours differs
import { saveFlipVote, saveFlipReply } from "../lib/flipsPersistence";

type Post = {
  id: string;             // Firestore doc id for the original post
  originalText: string;   // Original text
  authorId: string;       // Post owner (optional, but handy)
  createdAt?: any;
};

type Props = {
  post: Post;
  apiBase: string; // pass NEXT_PUBLIC_API_BASE from parent/page
};

export default function PostCard({ post, apiBase }: Props) {
  const [user] = useAuthState(auth);
  const userId = user?.uid || "anon";

  return (
    <div className="rounded-3xl border p-4 bg-white shadow-sm">
      <SwipeDeck
        postId={post.id}
        originalText={post.originalText}
        apiBase={apiBase}
        onVote={async (flipIndex, promptKey, direction, text) => {
          // persist vote
          await saveFlipVote({
            postId: post.id,
            flipIndex,
            promptKey,
            direction,
            text,
            userId,
          });
        }}
        onReply={async (flipIndex, promptKey, text, replyBody) => {
          // persist reply
          await saveFlipReply({
            postId: post.id,
            flipIndex,
            promptKey,
            text,
            replyBody,
            userId,
          });
        }}
      />
    </div>
  );
}
