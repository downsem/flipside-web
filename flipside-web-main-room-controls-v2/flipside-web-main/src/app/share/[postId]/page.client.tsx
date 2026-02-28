// src/app/share/[postId]/page.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot, collection, query } from "firebase/firestore";
import { db } from "@/app/firebase";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";

type Post = any;
type LensParam = "original" | TimelineId;

export default function SharePageClient({ postId }: { postId: string }) {
  const searchParams = useSearchParams();
  const lens = (searchParams.get("lens") || "original") as LensParam;

  const [post, setPost] = useState<Post | null>(null);
  const [rewrites, setRewrites] = useState<Record<TimelineId, any>>({
    calm: undefined,
    bridge: undefined,
    cynical: undefined,
    opposite: undefined,
    playful: undefined,
  });
  const [loading, setLoading] = useState(true);

  // Load post
  useEffect(() => {
    if (!postId) return;

    const ref = doc(db, "posts", postId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPost(null);
          setLoading(false);
          return;
        }
        setPost({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (err) => {
        console.error("Error loading post:", err);
        setPost(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [postId]);

  // Load rewrites
  useEffect(() => {
    if (!postId) return;

    const rewritesRef = collection(db, "posts", postId, "rewrites");
    const q = query(rewritesRef);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<TimelineId, any> = {
          calm: undefined as any,
          bridge: undefined as any,
          cynical: undefined as any,
          opposite: undefined as any,
          playful: undefined as any,
        };

        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const id = data.timelineId as TimelineId;
          if (id) map[id] = { id, ...data };
        });

        setRewrites(map);
      },
      (err) => console.error("Error loading rewrites:", err)
    );

    return () => unsub();
  }, [postId]);

  const card = useMemo(() => {
    if (!post) return null;

    if (lens === "original") {
      return {
        id: "original" as const,
        label: "Original",
        icon: undefined,
        text: post.text || "",
      };
    }

    const spec = TIMELINE_LIST.find((t) => t.id === lens);
    const rw = rewrites[lens];
    return {
      id: lens,
      label: spec?.label ?? lens,
      icon: spec?.icon,
      text: rw?.text || "(Generating rewrite…)",
    };
  }, [post, lens, rewrites]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const fullDeckUrl = origin ? `${origin}/post/${postId}` : `/post/${postId}`;

  const hasSource = !!post?.sourceUrl;
  const sourceLabel =
    post?.sourcePlatform && post.sourcePlatform !== "other"
      ? post.sourcePlatform.charAt(0).toUpperCase() +
        post.sourcePlatform.slice(1)
      : "original post";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!post || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">
            This share link is invalid (post missing or deleted).
          </p>
          <div className="mt-3">
            <Link href="/feed" className="text-xs underline text-slate-800">
              Back to feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            FS
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Flipside
            </span>
            <span className="text-[10px] text-slate-500">
              Shared lens view
            </span>
          </div>
        </div>

        <Link
          href="/feed"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm"
        >
          Back to feed
        </Link>
      </header>

      {/* Share card */}
      <main className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-xl space-y-3">
          {/* Lens badge row */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-700">
                {card.icon && <span className="mr-1">{card.icon}</span>}
                {card.label}
              </span>
            </div>

            <a
              href={fullDeckUrl}
              className="text-[11px] px-3 py-1 rounded-full bg-slate-900 text-white shadow-sm"
            >
              Open full deck →
            </a>
          </div>

          {/* Attribution */}
          {hasSource && (
            <div className="text-[11px] text-slate-500">
              <span>This Flip was originally posted on: </span>
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
                title={sourceLabel}
              >
                {post.sourceUrl}
              </a>
            </div>
          )}

          {/* Main card */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-900 whitespace-pre-wrap">
              {card.text}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                See this post through five lenses on Flipside.
              </span>
              <a
                href={fullDeckUrl}
                className="text-[11px] font-medium underline text-slate-800"
              >
                flipside.app/post/{postId}
              </a>
            </div>
          </div>

          {/* Footer helper */}
          <p className="text-[10px] text-slate-500">
            Tip: take a screenshot of this page to share anywhere.
          </p>
        </div>
      </main>
    </div>
  );
}
