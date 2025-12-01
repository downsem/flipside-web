// src/components/SwipeDeck.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/app/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";
import PostCard from "./PostCard";

type Post = {
  id: string;
  text: string;
  authorId?: string | null;
  createdAt?: any;
  votes?: number;
  replyCount?: number;
};

type RewriteDoc = {
  id: string;
  postId: string;
  timelineId: TimelineId;
  text: string;
  votes: number;
  replyCount: number;
};

type Card = {
  id: string;
  type: "original" | "rewrite";
  timelineId?: TimelineId;
  label: string;
  text: string;
  votes?: number;
  replyCount?: number;
};

type FilterValue = "all" | TimelineId;

type SwipeDeckProps = {
  post: Post;
  activeTimelineFilter?: FilterValue;
};

export default function SwipeDeck({
  post,
  activeTimelineFilter = "all",
}: SwipeDeckProps) {
  const [rewrites, setRewrites] = useState<RewriteDoc[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loadingRewrites, setLoadingRewrites] = useState(true);

  // Subscribe to rewrites for this post
  useEffect(() => {
    const rewritesRef = collection(db, "posts", post.id, "rewrites");
    const unsub = onSnapshot(
      rewritesRef,
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
        setLoadingRewrites(false);
      },
      (err) => {
        console.error("Error loading rewrites for post", post.id, err);
        setLoadingRewrites(false);
      }
    );

    return () => unsub();
  }, [post.id]);

  // Build card list from original + rewrites, then apply filter
  useEffect(() => {
    // Original label = "Default (All)" to match your UI
    const originalCard: Card = {
      id: "original",
      type: "original",
      label: "Default (All)",
      text: post.text,
      votes: post.votes ?? 0,
      replyCount: post.replyCount ?? 0,
    };

    const rewriteMap = new Map<TimelineId, RewriteDoc>(
      rewrites.map((rw) => [rw.timelineId, rw])
    );

    const rewriteCards: Card[] = [];
    for (const t of TIMELINE_LIST) {
      const rw = rewriteMap.get(t.id);
      if (!rw) continue;
      rewriteCards.push({
        id: rw.id,
        type: "rewrite",
        timelineId: rw.timelineId,
        label: t.label,
        text: rw.text,
        votes: rw.votes,
        replyCount: rw.replyCount,
      });
    }

    let filtered: Card[];

    if (activeTimelineFilter === "all") {
      // Default mode: Original + all rewrites
      filtered = [originalCard, ...rewriteCards];
    } else {
      // Lens-only mode: only that lens's rewrite, no original
      filtered = rewriteCards.filter(
        (card) => card.timelineId === activeTimelineFilter
      );
    }

    if (filtered.length === 0) {
      filtered = [originalCard];
    }

    setCards(filtered);

    setIndex((prev) => {
      if (prev >= filtered.length) {
        return filtered.length - 1 >= 0 ? filtered.length - 1 : 0;
      }
      return prev;
    });
  }, [rewrites, post.text, post.votes, post.replyCount, activeTimelineFilter]);

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
      label: "Default (All)",
      text: post.text,
      votes: post.votes ?? 0,
      replyCount: post.replyCount ?? 0,
    };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-[180px] px-4 pt-3 pb-2">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={currentCard.id + index}
            className="h-full"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
          >
            <PostCard
              postId={post.id}
              card={currentCard}
              isLoadingRewrites={loadingRewrites}
              cardIndex={index + 1}
              totalCards={totalCards}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-4 pb-3 pt-1 text-xs">
        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-40"
          >
            ◀ Prev
          </button>
          <button
            onClick={goNext}
            disabled={index >= totalCards - 1}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-40"
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}
