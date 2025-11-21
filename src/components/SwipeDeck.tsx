"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/app/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { TIMELINES } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";
import PostCard from "./PostCard";

interface Post {
  id: string;
  text: string;
  createdAt?: any;
  authorId?: string | null;
}

interface RewriteDoc {
  id: string;
  postId: string;
  timelineId: TimelineId;
  text: string;
  votes: number;
  replyCount?: number;
}

interface Card {
  id: string;
  type: "original" | "rewrite";
  timelineId?: TimelineId;
  label: string;
  text: string;
  votes?: number;
  replyCount?: number;
}

interface SwipeDeckProps {
  post: Post;
}

export default function SwipeDeck({ post }: SwipeDeckProps) {
  const [rewrites, setRewrites] = useState<RewriteDoc[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoadingRewrites, setIsLoadingRewrites] = useState(true);

  // Subscribe to rewrites for this post
  useEffect(() => {
    const rewritesRef = collection(db, "posts", post.id, "rewrites");
    const q = query(rewritesRef, orderBy("timelineId", "asc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows: RewriteDoc[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            postId: data.postId ?? post.id,
            timelineId: data.timelineId as TimelineId,
            text: data.text ?? "",
            votes: data.votes ?? 0,
            replyCount: data.replyCount ?? 0,
          };
        });
        setRewrites(rows);
        setIsLoadingRewrites(false);
      },
      (err) => {
        console.error("Error loading rewrites for post", post.id, err);
        setIsLoadingRewrites(false);
      }
    );

    return () => unsub();
  }, [post.id]);

  // Build the swipeable card list whenever rewrites change
  useEffect(() => {
    const list: Card[] = [];

    // Original first
    list.push({
      id: "original",
      type: "original",
      label: "Original",
      text: post.text,
    });

    const rewriteMap = new Map(
      rewrites.map((rw) => [rw.timelineId, rw])
    );

    // Then rewrites in consistent timeline order
    for (const t of TIMELINES) {
      const rw = rewriteMap.get(t.id);
      if (!rw) continue;
      list.push({
        id: rw.id,
        type: "rewrite",
        timelineId: rw.timelineId,
        label: t.label,
        text: rw.text,
        votes: rw.votes,
        replyCount: rw.replyCount,
      });
    }

    setCards(list);
    setIndex(0); // reset to original when cards update
  }, [rewrites, post.text]);

  const totalCards = cards.length || 1;

  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, totalCards - 1));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const currentCard: Card =
    cards[index] ?? {
      id: "original",
      type: "original",
      label: "Original",
      text: post.text,
    };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        <span>Flip</span>
        <span>
          {index + 1}/{totalCards}
        </span>
      </div>

      <div className="relative min-h-[180px]">
        <AnimatePresence initial={false} custom={index}>
          <motion.div
            key={currentCard.id}
            className="p-4"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
          >
            <PostCard
              postId={post.id}
              card={currentCard}
              isLoadingRewrites={isLoadingRewrites}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="rounded-full border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <div className="flex items-center gap-1 text-gray-400 text-[10px]">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? "bg-gray-700" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          disabled={index >= totalCards - 1}
          className="rounded-full border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
