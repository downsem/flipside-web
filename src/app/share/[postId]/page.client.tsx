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

type ShareExtensionDeck = {
  id: string;
  sourcePost?: any;
  deck: Record<string, string>;
};

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function platformLabel(value: unknown): string {
  const platform = cleanText(value).toLowerCase();
  if (platform === "x") return "X";
  if (platform === "bluesky") return "Bluesky";
  if (platform === "threads") return "Threads";
  if (platform === "instagram") return "Instagram";
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube") return "YouTube";
  if (platform === "reddit") return "Reddit";
  return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Source";
}

export default function SharePageClient({ postId }: { postId: string }) {
  const searchParams = useSearchParams();
  const lens = (searchParams.get("lens") || "original") as LensParam;

  const [post, setPost] = useState<Post | null>(null);
  const [extensionDeck, setExtensionDeck] = useState<ShareExtensionDeck | null>(null);
  const [rewrites, setRewrites] = useState<Record<TimelineId, any>>({
    calm: undefined,
    bridge: undefined,
    cynical: undefined,
    opposite: undefined,
    playful: undefined,
  });
  const [loading, setLoading] = useState(true);

  // Load a normal app post first. If it is missing, fall back to a stored
  // share-extension deck so extension-created links can open the exact deck.
  useEffect(() => {
    if (!postId) return undefined;

    let active = true;
    const ref = doc(db, "posts", postId);

    async function loadShareExtensionDeck(deckId: string) {
      try {
        const res = await fetch(`/api/share-extension/flip?deckId=${encodeURIComponent(deckId)}`);
        const json = await res.json().catch(() => null);

        if (!active) return;

        if (res.ok && json?.ok && json?.deck) {
          setPost(null);
          setExtensionDeck({
            id: deckId,
            sourcePost: json.sourcePost || {},
            deck: json.deck || {},
          });
        } else {
          setPost(null);
          setExtensionDeck(null);
        }
      } catch (err) {
        console.error("Error loading share-extension deck:", err);
        if (active) {
          setPost(null);
          setExtensionDeck(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!active) return;

        if (snap.exists()) {
          setPost({ id: snap.id, ...snap.data() });
          setExtensionDeck(null);
          setLoading(false);
          return;
        }

        loadShareExtensionDeck(postId);
      },
      (err) => {
        console.error("Error loading post:", err);
        loadShareExtensionDeck(postId);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [postId]);

  // Load rewrites only for real app posts. Share-extension decks already carry
  // their generated lens text in the stored deck payload.
  useEffect(() => {
    if (!postId || !post) return undefined;

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
  }, [postId, post]);

  const lensOptions = useMemo(
    () => [
      { id: "original" as LensParam, label: "Original", icon: undefined },
      ...TIMELINE_LIST.map((item) => ({
        id: item.id as LensParam,
        label: item.label,
        icon: item.icon,
      })),
    ],
    []
  );

  const card = useMemo(() => {
    if (extensionDeck) {
      if (lens === "original") {
        return {
          id: "original" as const,
          label: "Original",
          icon: undefined,
          text:
            cleanText(extensionDeck.deck?.original) ||
            cleanText(extensionDeck.sourcePost?.text) ||
            "Open the original source to view this post.",
        };
      }

      const spec = TIMELINE_LIST.find((t) => t.id === lens);
      return {
        id: lens,
        label: spec?.label ?? lens,
        icon: spec?.icon,
        text: cleanText(extensionDeck.deck?.[lens]) || "(Missing lens text.)",
      };
    }

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
  }, [post, extensionDeck, lens, rewrites]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const fullDeckUrl = origin
    ? post
      ? `${origin}/post/${postId}`
      : `${origin}/share/${postId}`
    : post
      ? `/post/${postId}`
      : `/share/${postId}`;

  const displayDeckUrl = fullDeckUrl.replace(/^https?:\/\//, "");

  const sourcePost = extensionDeck?.sourcePost || {};
  const sourceUrl = post?.sourceUrl || sourcePost.url || sourcePost.sourceUrl || "";
  const hasSource = !!sourceUrl;
  const sourceLabel = platformLabel(post?.sourcePlatform || sourcePost.platform || "source");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!post && !extensionDeck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">
            This share link is invalid, missing, or deleted.
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

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-xs text-slate-500">Loading lens…</p>
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
              FlipSide
            </span>
            <span className="text-[10px] text-slate-500">
              Shared Flip Deck
            </span>
          </div>
        </div>

        <Link
          href="/feed"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm"
        >
          Open FlipSide
        </Link>
      </header>

      {/* Share card */}
      <main className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-xl space-y-3">
          {/* Lens badge row */}
          <div className="flex items-center justify-between gap-3">
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

          {/* Lens nav */}
          <div className="flex flex-wrap gap-2">
            {lensOptions.map((option) => {
              const active = option.id === lens;
              return (
                <Link
                  key={option.id}
                  href={`/share/${postId}?lens=${option.id}`}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {option.icon ? `${option.icon} ` : ""}
                  {option.label}
                </Link>
              );
            })}
          </div>

          {/* Attribution */}
          {hasSource && (
            <div className="text-[11px] text-slate-500">
              <span>This Flip was originally posted on {sourceLabel}: </span>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
                title={sourceLabel}
              >
                {sourceUrl}
              </a>
            </div>
          )}

          {/* Main card */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-900 whitespace-pre-wrap">
              {card.text}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500">
                See this post through five lenses on FlipSide.
              </span>
              <a
                href={fullDeckUrl}
                className="text-[11px] font-medium underline text-slate-800 break-all text-right"
              >
                {displayDeckUrl}
              </a>
            </div>
          </div>

          {/* Footer helper */}
          <p className="text-[10px] text-slate-500">
            Swipe the shared cards, or use the lens buttons above to open a specific perspective.
          </p>
        </div>
      </main>
    </div>
  );
}
