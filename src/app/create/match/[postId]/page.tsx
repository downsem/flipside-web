"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { db } from "@/app/firebase";
import { TIMELINE_LIST, type TimelineId } from "@/theme/timelines";
import { useSwipe } from "@/components/deck/useSwipe";

type Candidate = {
  postId: string;
  authorId: string | null;
  authorIsAnonymous?: boolean;
  originalText: string;
  lensText: string;
  timelineId: TimelineId;
  score: number;
  createdAtMs: number;
};

type CandidateMap = Record<TimelineId, Candidate[]>;
type SelectionMap = Partial<Record<TimelineId, Candidate>>;

type PostDoc = {
  id: string;
  text: string;
  authorId?: string | null;
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  authorIsAnonymous?: boolean;
  flipType?: "ai" | "people";
  status?: string;
};

const EMPTY_CANDIDATES: CandidateMap = {
  calm: [],
  bridge: [],
  cynical: [],
  opposite: [],
  playful: [],
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "it",
  "this",
  "that",
  "be",
  "as",
  "at",
  "are",
  "was",
  "were",
  "by",
  "from",
  "about",
  "your",
  "their",
  "they",
  "them",
  "you",
  "our",
  "but",
  "if",
  "so",
  "we",
  "i",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function scoreTopic(anchorText: string, candidateText: string): number {
  const anchor = new Set(tokenize(anchorText));
  const candidate = tokenize(candidateText);
  if (!anchor.size || !candidate.length) return 0;

  let overlap = 0;
  for (const token of candidate) {
    if (anchor.has(token)) overlap += 1;
  }

  return overlap / Math.max(1, Math.min(anchor.size, candidate.length));
}

export default function MatchPeoplePage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = params?.postId as string;

  const [anchorPost, setAnchorPost] = useState<PostDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateMap>(EMPTY_CANDIDATES);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [activeLens, setActiveLens] = useState<TimelineId>("calm");
  const [candidateIndexByLens, setCandidateIndexByLens] = useState<Record<TimelineId, number>>({
    calm: 0,
    bridge: 0,
    cynical: 0,
    opposite: 0,
    playful: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const anchorSnap = await getDoc(doc(db, "posts", postId));
        if (!anchorSnap.exists()) {
          setError("We couldn't find that draft People flip.");
          setLoading(false);
          return;
        }

        const anchor = { id: anchorSnap.id, ...(anchorSnap.data() as any) } as PostDoc;
        if (!cancelled) setAnchorPost(anchor);

        const postsSnap = await getDocs(
          query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(40))
        );

        const nextCandidates: CandidateMap = {
          calm: [],
          bridge: [],
          cynical: [],
          opposite: [],
          playful: [],
        };

        await Promise.all(
          postsSnap.docs.map(async (postSnap) => {
            if (postSnap.id === postId) return;

            const post = { id: postSnap.id, ...(postSnap.data() as any) } as PostDoc;
            if (post.status === "draft") return;

            const topicScore = scoreTopic(anchor.text, post.text || "");
            const rewritesSnap = await getDocs(collection(db, "posts", post.id, "rewrites"));
            const createdAtMs = (postSnap.data() as any)?.createdAt?.toMillis?.() ?? 0;

            rewritesSnap.forEach((rewriteDoc) => {
              const rewrite = rewriteDoc.data() as any;
              const timelineId = rewrite.timelineId as TimelineId | undefined;
              if (!timelineId || !nextCandidates[timelineId]) return;
              if (!rewrite?.text) return;

              nextCandidates[timelineId].push({
                postId: post.id,
                authorId: post.authorId ?? null,
                authorIsAnonymous: !!post.authorIsAnonymous,
                originalText: post.text,
                lensText: rewrite.text,
                timelineId,
                score: topicScore,
                createdAtMs,
              });
            });
          })
        );

        (Object.keys(nextCandidates) as TimelineId[]).forEach((lens) => {
          nextCandidates[lens] = nextCandidates[lens]
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              return b.createdAtMs - a.createdAtMs;
            })
            .slice(0, 8);
        });

        if (!cancelled) setCandidates(nextCandidates);
      } catch (err) {
        console.error("[people-match] load error", err);
        if (!cancelled) setError("Couldn’t load matching flips right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const activeCandidates = candidates[activeLens] ?? [];
  const currentIndex = candidateIndexByLens[activeLens] ?? 0;
  const currentCandidate = activeCandidates[currentIndex] ?? null;
  const completedCount = useMemo(
    () => TIMELINE_LIST.filter((lens) => !!selections[lens.id]).length,
    [selections]
  );
  const allSelected = completedCount === TIMELINE_LIST.length;

  const swipe = useSwipe({
    onLeft: () => {
      setCandidateIndexByLens((prev) => ({
        ...prev,
        [activeLens]: Math.min((prev[activeLens] ?? 0) + 1, Math.max(activeCandidates.length - 1, 0)),
      }));
    },
    onRight: () => {
      setCandidateIndexByLens((prev) => ({
        ...prev,
        [activeLens]: Math.max((prev[activeLens] ?? 0) - 1, 0),
      }));
    },
  });

  function selectCandidate(candidate: Candidate) {
    setSelections((prev) => ({ ...prev, [candidate.timelineId]: candidate }));
  }

  async function publishDeck() {
    if (!anchorPost || !allSelected || publishing) return;

    setPublishing(true);
    setError(null);

    try {
      await Promise.all(
        TIMELINE_LIST.map(async (lens) => {
          const selection = selections[lens.id];
          if (!selection) return;

          await setDoc(
            doc(db, "posts", postId, "rewrites", lens.id),
            {
              timelineId: lens.id,
              text: selection.lensText,
              sourcePostId: selection.postId,
              sourceTimelineId: lens.id,
              sourceAuthorId: selection.authorId ?? null,
              sourceOriginalText: selection.originalText,
              pickedAt: serverTimestamp(),
            },
            { merge: true }
          );
        })
      );

      await updateDoc(doc(db, "posts", postId), {
        status: "published",
        publishedAt: serverTimestamp(),
        peopleDeck: {
          selectionCount: TIMELINE_LIST.length,
          sourcePostIds: TIMELINE_LIST.map((lens) => selections[lens.id]?.postId).filter(Boolean),
        },
      });

      router.push("/feed");
    } catch (err) {
      console.error("[people-match] publish error", err);
      setError("Couldn’t publish this People deck.");
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Match Flips">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-[28px]" />
          <Skeleton className="h-64 w-full rounded-[28px]" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </AppShell>
    );
  }

  if (error && !anchorPost) {
    return (
      <AppShell title="Match Flips">
        <EmptyState
          title="Couldn’t load this People draft"
          description={error}
          ctaLabel="Back to create"
          onCta={() => router.push("/")}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Match Flips"
      headerRight={<Link href="/feed" className="text-sm underline">Feed</Link>}
    >
      <div className="space-y-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Your anchor post</div>
          <div className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-900 whitespace-pre-wrap">
            {anchorPost?.text}
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            Pick one real flip for each lens. Swipe left or right to browse candidates.
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap gap-2">
            {TIMELINE_LIST.map((lens) => {
              const selected = !!selections[lens.id];
              const active = activeLens === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setActiveLens(lens.id)}
                  className={`rounded-full px-3 py-2 text-sm ${
                    active
                      ? "bg-neutral-900 text-white"
                      : selected
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-white border border-neutral-200 text-neutral-700"
                  }`}
                >
                  {lens.label.replace(/-.*/, "")}
                  {selected ? " ✓" : ""}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            {completedCount}/{TIMELINE_LIST.length} lenses selected
          </div>
        </Card>

        {!currentCandidate ? (
          <EmptyState
            title={`No ${activeLens} matches yet`}
            description="There aren’t enough similar flips in the feed for this lens right now. Create more AI flips first, then come back here."
          />
        ) : (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {TIMELINE_LIST.find((lens) => lens.id === activeLens)?.label}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Candidate {currentIndex + 1} of {activeCandidates.length}
                </div>
              </div>
              <div className="text-[11px] text-neutral-500">Swipe to browse</div>
            </div>

            <div
              onPointerDown={swipe.onPointerDown}
              onPointerUp={swipe.onPointerUp}
              className="mt-4 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Original post
              </div>
              <div className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
                {currentCandidate.originalText}
              </div>

              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {TIMELINE_LIST.find((lens) => lens.id === activeLens)?.label}
              </div>
              <div className="mt-2 text-sm text-neutral-950 whitespace-pre-wrap">
                {currentCandidate.lensText}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCandidateIndexByLens((prev) => ({
                    ...prev,
                    [activeLens]: Math.max((prev[activeLens] ?? 0) - 1, 0),
                  }))
                }
                disabled={currentIndex === 0}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCandidateIndexByLens((prev) => ({
                    ...prev,
                    [activeLens]: Math.min((prev[activeLens] ?? 0) + 1, activeCandidates.length - 1),
                  }))
                }
                disabled={currentIndex >= activeCandidates.length - 1}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
              <div className="ml-auto">
                <Button type="button" onClick={() => selectCandidate(currentCandidate)}>
                  {selections[activeLens]?.postId === currentCandidate.postId ? "Selected" : "Select this flip"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Selections</div>
          <div className="mt-3 space-y-2">
            {TIMELINE_LIST.map((lens) => {
              const selection = selections[lens.id];
              return (
                <div key={lens.id} className="rounded-2xl border border-neutral-200 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {lens.label}
                  </div>
                  <div className="mt-2 text-sm text-neutral-900 whitespace-pre-wrap">
                    {selection?.lensText ?? "No flip selected yet."}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <Button type="button" disabled={!allSelected || publishing} loading={publishing} className="w-full" onClick={publishDeck}>
          Publish Deck
        </Button>
      </div>
    </AppShell>
  );
}
