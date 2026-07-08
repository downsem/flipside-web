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

const LENS_ORDER: LensParam[] = [
  "original",
  "opposite",
  "cynical",
  "playful",
  "bridge",
  "calm",
];

const LENS_LABELS: Record<string, string> = {
  original: "Original",
  opposite: "Opposite",
  cynical: "Cynical",
  playful: "Satirical",
  bridge: "Bridge",
  calm: "Calm",
};

const LENS_ICONS: Record<string, string> = {
  original: "●",
  opposite: "↔",
  cynical: "⌁",
  playful: "✦",
  bridge: "◇",
  calm: "•",
};

function cleanText(value: unknown): string {
  return String(value || "").trim();
}


function byLensUrl(postId: string, lensId: LensParam) {
  return lensId === "original"
    ? `/share/${postId}`
    : `/share/${postId}?lens=${lensId}`;
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


  const deckTextByLens = useMemo(() => {
    if (extensionDeck) {
      return {
        original:
          cleanText(extensionDeck.deck?.original) ||
          cleanText(extensionDeck.sourcePost?.text) ||
          "Open the original source to view this post.",
        calm: cleanText(extensionDeck.deck?.calm),
        bridge: cleanText(extensionDeck.deck?.bridge),
        cynical: cleanText(extensionDeck.deck?.cynical),
        opposite: cleanText(extensionDeck.deck?.opposite),
        playful: cleanText(extensionDeck.deck?.playful),
      };
    }

    if (!post) {
      return {
        original: "",
        calm: "",
        bridge: "",
        cynical: "",
        opposite: "",
        playful: "",
      };
    }

    return {
      original: cleanText(post.text),
      calm: cleanText(rewrites.calm?.text) || "(Generating rewrite…)",
      bridge: cleanText(rewrites.bridge?.text) || "(Generating rewrite…)",
      cynical: cleanText(rewrites.cynical?.text) || "(Generating rewrite…)",
      opposite: cleanText(rewrites.opposite?.text) || "(Generating rewrite…)",
      playful: cleanText(rewrites.playful?.text) || "(Generating rewrite…)",
    };
  }, [extensionDeck, post, rewrites]);

  const card = useMemo(() => {
    const label = LENS_LABELS[lens] ?? lens;
    const icon = LENS_ICONS[lens];
    const text = deckTextByLens[lens as keyof typeof deckTextByLens] || "";
    return { id: lens, label, icon, text };
  }, [deckTextByLens, lens]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const fullDeckUrl = origin
    ? post
      ? `${origin}/post/${postId}`
      : `${origin}/share/${postId}`
    : post
      ? `/post/${postId}`
      : `/share/${postId}`;

  const activeLensIndex = Math.max(0, LENS_ORDER.indexOf(lens));
  const availableLensCount = LENS_ORDER.filter((id) => {
    const text = deckTextByLens[id as keyof typeof deckTextByLens];
    return cleanText(text).length > 0;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F0FF] flex items-center justify-center px-6 text-[#0C0C12]">
        <div className="rounded-[32px] border border-[#E7D9FF] bg-white p-6 shadow-sm">
          <p className="text-sm font-black">Loading Flip Deck…</p>
          <p className="mt-1 text-xs font-semibold text-[#7B728A]">
            Pulling the shared lenses into view.
          </p>
        </div>
      </div>
    );
  }

  if (!post && !extensionDeck) {
    return (
      <div className="min-h-screen bg-[#F7F0FF] flex flex-col items-center justify-center px-6 text-[#0C0C12]">
        <div className="w-full max-w-xl rounded-[32px] border border-[#E7D9FF] bg-white p-6 shadow-sm">
          <p className="text-lg font-black">
            This Flip Deck is missing.
          </p>
          <p className="mt-2 text-sm font-semibold text-[#7B728A]">
            The link may be invalid, expired, or deleted.
          </p>
          <div className="mt-5">
            <Link
              href="/feed"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0C0C12] px-5 text-sm font-black text-white"
            >
              Open FlipSide
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F7F0FF] text-[#0C0C12]">
      <header className="sticky top-0 z-20 border-b border-[#E7D9FF] bg-[#F7F0FF]/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0C0C12] text-sm font-black text-white shadow-sm">
              FS
            </div>
            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight text-[#2D176D]">
                FlipSide
              </div>
              <div className="text-xs font-bold text-[#7B728A]">
                Shared Flip Deck
              </div>
            </div>
          </div>

          <a
            href="https://backroom.cloud"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#DCCAFF] bg-white px-5 text-sm font-black text-[#1A1325] shadow-sm"
          >
            Open FlipSide
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-14">
        <section className="rounded-[36px] border border-[#E7D9FF] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE4FF] px-4 py-2 text-sm font-black text-[#4B2BCE]">
              <span>{card.icon}</span>
              <span>{card.label}</span>
            </div>

            <a
              href={fullDeckUrl}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#0C0C12] px-5 text-sm font-black text-white shadow-sm"
            >
              Full deck →
            </a>
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {LENS_ORDER.map((lensId) => {
                const active = lensId === lens;
                const label = LENS_LABELS[lensId] ?? lensId;
                const icon = LENS_ICONS[lensId] ?? "";
                return (
                  <Link
                    key={lensId}
                    href={byLensUrl(postId, lensId)}
                    className={[
                      "inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-black shadow-sm transition",
                      active
                        ? "border-[#0C0C12] bg-[#0C0C12] text-white"
                        : "border-[#E7D9FF] bg-white text-[#5E536D]",
                    ].join(" ")}
                  >
                    <span className="mr-1.5">{icon}</span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <article className="mt-4 rounded-[32px] border border-[#E7D9FF] bg-[#FBF8FF] p-6">
            <p className="whitespace-pre-wrap text-[24px] font-black leading-[1.25] tracking-[-0.03em] text-[#111018] sm:text-[30px]">
              {card.text}
            </p>

            <div className="mt-6 border-t border-[#E7D9FF] pt-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7B728A]">
                    Flipped via FlipSide
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#7B728A]">
                    {availableLensCount || 6} perspectives. 1 post.
                  </p>
                </div>
                <a
                  href={fullDeckUrl}
                  className="max-w-[52%] break-all text-right text-xs font-black text-[#2D176D] underline"
                >
                  Open full deck
                </a>
              </div>
            </div>
          </article>

          <div className="mt-4 flex items-center justify-center gap-2">
            {LENS_ORDER.map((lensId, index) => (
              <span
                key={lensId}
                className={[
                  "h-2 rounded-full transition-all",
                  index === activeLensIndex
                    ? "w-8 bg-[#4B2BCE]"
                    : "w-2 bg-[#DCCAFF]",
                ].join(" ")}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
