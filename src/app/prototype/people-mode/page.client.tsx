"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TimelineId } from "@/theme/timelines";
import { TIMELINE_LIST } from "@/theme/timelines";
import { usePrototypeStore } from "@/prototype/people/store";
import { ROOM_SEED_KEY } from "@/prototype/rooms/store";

const ORDER: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

function titleFor(t: TimelineId) {
  const spec = TIMELINE_LIST.find((x) => x.id === t)!;
  return { label: spec.label, icon: spec.icon };
}

export default function PeopleModeBuilderClient() {
  const {
    peopleDraft,
    getCandidatesForDraft,
    lockDraftMatch,
    unlockDraftLens,
    publishDraftPeopleDeck,
    clearDraftPeopleDeck,
  } = usePrototypeStore();
  const router = useRouter();

  const [activeLens, setActiveLens] = useState<TimelineId>("calm");
  const [candidateIndexByLens, setCandidateIndexByLens] = useState<
    Record<TimelineId, number>
  >({
    calm: 0,
    bridge: 0,
    cynical: 0,
    opposite: 0,
    playful: 0,
  });

  // Set active lens once draft exists; guard to avoid loops
  useEffect(() => {
    if (!peopleDraft) return;
    const firstUnlocked = ORDER.find((t) => !peopleDraft.locked?.[t]) ?? "calm";
    setActiveLens((prev) => (prev === firstUnlocked ? prev : firstUnlocked));
  }, [peopleDraft]);

  const progress = useMemo(() => {
    if (!peopleDraft) return 0;
    return ORDER.filter((t) => !!peopleDraft.locked?.[t]).length;
  }, [peopleDraft]);

  const candidates = useMemo(() => {
    if (!peopleDraft) return [];
    return getCandidatesForDraft(activeLens) ?? [];
  }, [peopleDraft, activeLens, getCandidatesForDraft]);

  const currentIndex = candidateIndexByLens[activeLens] ?? 0;
  const currentCandidate = candidates[currentIndex] ?? candidates[0];

  function setCandidateIndex(lens: TimelineId, nextIndex: number) {
    setCandidateIndexByLens((prev) => ({
      ...prev,
      [lens]: nextIndex,
    }));
  }

  function nextCandidate() {
    if (!candidates.length) return;
    const cur = candidateIndexByLens[activeLens] ?? 0;
    const next = (cur + 1) % candidates.length;
    setCandidateIndex(activeLens, next);
  }

  function prevCandidate() {
    if (!candidates.length) return;
    const cur = candidateIndexByLens[activeLens] ?? 0;
    const next = (cur - 1 + candidates.length) % candidates.length;
    setCandidateIndex(activeLens, next);
  }

  function goToLens(t: TimelineId) {
    setActiveLens(t);

    // If locked, snap to locked post in candidate list
    const locked = peopleDraft?.locked?.[t];
    if (locked) {
      const pool = getCandidatesForDraft(t) ?? [];
      const idx = pool.findIndex((p) => p.id === locked.id);
      setCandidateIndex(t, idx >= 0 ? idx : 0);
    }
  }

  function handleLock() {
    if (!peopleDraft || !currentCandidate) return;

    lockDraftMatch(activeLens, currentCandidate.id);

    // Move to next unlocked lens
    const nextLens =
      ORDER.find((t) => !peopleDraft.locked?.[t] && t !== activeLens) ??
      ORDER.find((t) => !peopleDraft.locked?.[t]);

    if (nextLens) setActiveLens(nextLens);
  }

  function handleReset() {
    clearDraftPeopleDeck();
    router.push("/prototype/create");
  }

  function handlePublish() {
    const published = publishDraftPeopleDeck();
    if (!published) return;
    router.push("/prototype?published=1");
  }

  // Keyboard: left=next, right=prev, enter=lock
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // keep your existing convention:
      if (e.key === "ArrowRight") prevCandidate();
      if (e.key === "ArrowLeft") nextCandidate();
      if (e.key === "Enter") handleLock();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLens, candidates, candidateIndexByLens, peopleDraft]);

  if (!peopleDraft) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-lg font-semibold text-slate-900">
              No draft found
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Start by creating a People Mode deck.
            </p>
            <Link
              href="/prototype/create"
              className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Go to Create
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lockedCard = (t: TimelineId) => {
    const locked = peopleDraft.locked?.[t] ?? null;
    const { label, icon } = titleFor(t);

    return (
      <button
        key={t}
        type="button"
        onClick={() => goToLens(t)}
        className={`w-full text-left rounded-2xl border px-4 py-3 ${
          activeLens === t
            ? "border-slate-900 bg-slate-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              <span className="mr-2">{icon}</span>
              {label}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {locked ? (
                <>
                  <span className="font-medium text-slate-700">
                    {locked.author.name}
                  </span>{" "}
                  <span className="text-slate-500">@{locked.author.handle}</span>
                </>
              ) : (
                "Not locked yet"
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700 border border-green-200">
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 border border-slate-200">
                Empty
              </span>
            )}
          </div>
        </div>

        {locked && (
          <div className="mt-2 text-xs text-slate-700 line-clamp-3">
            {locked.text}
          </div>
        )}

        {locked && (
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unlockDraftLens(t);
                goToLens(t);
              }}
              className="text-xs underline text-slate-600"
            >
              Replace
            </button>
          </div>
        )}
      </button>
    );
  };

  const { label: activeLabel, icon: activeIcon } = titleFor(activeLens);
  const isLocked = !!peopleDraft.locked?.[activeLens];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">People Mode</div>
            <h1 className="text-xl font-semibold text-slate-900">
              Build your deck
            </h1>
          </div>

          <Link href="/prototype" className="text-sm underline text-slate-700">
            Back to feed
          </Link>
        </div>
      </header>

      <main className="px-6 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Anchor · Ethan Downs{" "}
                    <span className="text-slate-500 font-medium">@ethan</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Progress: {progress}/5 locked · You own this deck
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    disabled={progress !== 5}
                    onClick={handlePublish}
                    className={`rounded-full px-3 py-2 text-xs font-medium ${
                      progress === 5
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    Publish
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-900 whitespace-pre-wrap">
                {peopleDraft.anchorText}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">
                  <span className="mr-2">{activeIcon}</span>
                  {activeLabel}
                </div>

                <div className="text-xs text-slate-500">
                  Candidates {candidates.length ? currentIndex + 1 : 0}/
                  {candidates.length || 0}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {currentCandidate ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div>
                        From{" "}
                        <span className="font-medium text-slate-700">
                          {currentCandidate.author.name}
                        </span>{" "}
                        <span>@{currentCandidate.author.handle}</span>
                      </div>
                      <div className="text-slate-400">
                        {currentCandidate.sourceType}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-900 whitespace-pre-wrap">
                      {currentCandidate.text}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-600">
                    No candidates available for this lens.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  left=next · right=prev · Enter=lock
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevCandidate}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    ← Prev
                  </button>

                  <button
                    type="button"
                    onClick={nextCandidate}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={handleLock}
                    disabled={!currentCandidate}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      currentCandidate
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isLocked ? "Update Lock ✅" : "Lock ✅"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900">
                  Locked Perspectives
                </div>
                <div className="text-xs text-slate-500">{progress}/5</div>
              </div>

              <div className="mt-4 space-y-3">{ORDER.map((t) => lockedCard(t))}</div>

              <div className="mt-4 text-xs text-slate-500">
                People Mode decks are curated artifacts. “Original” becomes{" "}
                <span className="font-medium">Anchor</span>.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}