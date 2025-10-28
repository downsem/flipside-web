// src/components/SwipeDeck.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineId } from "@/theme/timelines";

// ---- Types --------------------------------------------------------------

export type FilterKind = "all" | TimelineId;

export type Post = {
  id: string;
  originalText: string;
  authorId: string;
  // createdAt?: Timestamp | null   // not needed here
};

type SwipeDeckProps = {
  post: Post;
  apiBase: string;          // e.g. https://flipside.fly.dev
  filter: FilterKind;       // "all" or a lens id
  onVote?: (postId: string, dir: "up" | "down") => void;
  onDone?: () => void;      // called when card is swiped away
};

// ---- Simple in-memory cache to avoid repeat calls across re-renders ----
type CacheKey = `${string}:${string}`; // `${post.id}:${lens}`
const flipCache = new Map<CacheKey, string>(); // generated text per lens

// ---- Helpers ------------------------------------------------------------

async function generateFlip({
  apiBase,
  originalText,
  lens,
  signal,
}: {
  apiBase: string;
  originalText: string;
  lens: TimelineId;
  signal: AbortSignal;
}): Promise<string> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/flips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // If your backend ignores `lens`, that's fine; keeping it here for alignment.
    body: JSON.stringify({ text: originalText, lens }),
    signal,
  });

  if (!res.ok) {
    // Important: do NOT retry on 429 (rate limited).
    if (res.status === 429) {
      throw new Error("flips failed: 429 (Too Many Requests)");
    }
    const msg = await res.text().catch(() => "");
    throw new Error(`flips failed: ${res.status} ${msg}`);
  }

  // Expecting: { candidates: [{ text: "..." }, ...] } or { text: "..." }
  const data = await res.json();
  const text =
    data?.text ??
    data?.candidate?.text ??
    data?.candidates?.[0]?.text ??
    "";

  if (!text) throw new Error("flips failed: empty response");
  return text;
}

// ---- Component ----------------------------------------------------------

export default function SwipeDeck({
  post,
  apiBase,
  filter,
  onVote,
  onDone,
}: SwipeDeckProps) {
  const lens: TimelineId | null = filter === "all" ? null : (filter as TimelineId);

  const [genText, setGenText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(!!lens); // only load when a lens is chosen
  const [error, setError] = useState<string | null>(null);

  // Guard to prevent duplicate generation per mount/render
  const generatedRef = useRef<boolean>(false);
  // Track current request to abort on unmount or filter change
  const abortRef = useRef<AbortController | null>(null);

  // ---- Fetch on lens change (once per post+lens) -----------------------
  useEffect(() => {
    // Reset state whenever post or lens changes
    setError(null);

    if (!lens) {
      // "all" shows original; no generation needed
      setLoading(false);
      setGenText("");
      generatedRef.current = false;
      // Abort any in-flight request
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    const key: CacheKey = `${post.id}:${lens}`;
    const cached = flipCache.get(key);
    if (cached) {
      setGenText(cached);
      setLoading(false);
      generatedRef.current = true;
      return;
    }

    if (generatedRef.current) {
      // already kicked off in this mount
      return;
    }
    generatedRef.current = true;

    setLoading(true);
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        const text = await generateFlip({
          apiBase,
          originalText: post.originalText,
          lens,
          signal: ac.signal,
        });
        flipCache.set(key, text);
        setGenText(text);
        setLoading(false);
      } catch (e: any) {
        // If aborted, just bail silently
        if (e?.name === "AbortError") return;

        // Single soft retry for transient network errors (NOT for 429)
        if (!String(e?.message || "").includes("429")) {
          try {
            const text = await generateFlip({
              apiBase,
              originalText: post.originalText,
              lens,
              signal: ac.signal,
            });
            flipCache.set(key, text);
            setGenText(text);
            setLoading(false);
            return;
          } catch (e2: any) {
            if (e2?.name === "AbortError") return;
            setError(String(e2?.message || "Generation failed"));
            setLoading(false);
            console.error("generate error", e2);
            return;
          }
        }

        setError(String(e?.message || "Generation failed"));
        setLoading(false);
        console.error("generate error", e);
      }
    })();

    // cleanup on unmount / prop change
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      // let the next effect call decide generatedRef again
      generatedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, post.originalText, lens, apiBase]);

  // ---- Swipe logic (basic) ---------------------------------------------
  // Simple touch-based swipe that calls onVote and then onDone
  const startX = useRef<number | null>(null);
  const deltaX = useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    deltaX.current = e.touches[0].clientX - startX.current;
  };

  const onTouchEnd = () => {
    const d = deltaX.current;
    startX.current = null;
    deltaX.current = 0;
    // Threshold ~ 60px
    if (Math.abs(d) > 60) {
      const dir: "up" | "down" = d > 0 ? "up" : "down";
      onVote?.(post.id, dir);
      onDone?.();
    }
  };

  // ---- What text to display --------------------------------------------
  const displayText = useMemo(() => {
    if (!lens) return post.originalText;
    return genText || "";
  }, [lens, post.originalText, genText]);

  // ---- Render -----------------------------------------------------------
  return (
    <div
      className="w-full select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <article className="rounded-3xl bg-white shadow p-5">
        {/* Status row */}
        {lens ? (
          <>
            {loading && (
              <p className="text-sm text-gray-500">Generating {lens}…</p>
            )}
            {error && (
              <p className="text-sm text-red-600">
                {error.includes("429")
                  ? "Slowed down for a moment—too many requests. Try again shortly."
                  : error}
              </p>
            )}
          </>
        ) : null}

        {/* Content */}
        <div className="prose max-w-none text-gray-900 whitespace-pre-wrap">
          {displayText || (loading ? "" : "Nothing to show for this lens.")}
        </div>

        {/* Vote buttons as a11y backup to swipe */}
        <div className="mt-4 flex gap-3">
          <button
            aria-label="Downvote"
            className="rounded-xl border px-3 py-2"
            onClick={() => {
              onVote?.(post.id, "down");
              onDone?.();
            }}
          >
            👎
          </button>
          <button
            aria-label="Upvote"
            className="rounded-xl border px-3 py-2"
            onClick={() => {
              onVote?.(post.id, "up");
              onDone?.();
            }}
          >
            👍
          </button>
        </div>
      </article>
    </div>
  );
}
