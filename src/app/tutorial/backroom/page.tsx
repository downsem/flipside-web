// src/app/tutorial/backroom/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TOPICS } from "@/prototype/people/mockData";
import { usePrototypeStore } from "@/prototype/people/store";
import { createRoomFromDeck } from "@/prototype/rooms/store";
import { activateTutorial } from "@/tutorial/mode";
import type { TimelineId } from "@/theme/timelines";

const ORDER: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

export default function BackroomTutorialPage() {
  const router = useRouter();

  // Subscribe so UI updates if decks are added.
  const peopleDecks = usePrototypeStore((s) => s.peopleDecks);

  const [topicId, setTopicId] = useState<string>(TOPICS[0]?.id ?? "t01");
  const [roomTitle, setRoomTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [demoDeckIds, setDemoDeckIds] = useState<Record<string, string>>({});

  const topic = useMemo(() => {
    return TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];
  }, [topicId]);

  useEffect(() => {
    // Ensure tutorial mode is on when entering from anywhere.
    activateTutorial();

    // Seed prototype demo content (posts) if needed.
    // NOTE: seedIfNeeded is part of the zustand store state, not a named export.
    usePrototypeStore.getState().seedIfNeeded();
  }, []);

  function getOrCreateDemoDeckId(selectedTopicId: string) {
    const st0 = usePrototypeStore.getState();
    const existingId = demoDeckIds[selectedTopicId];
    if (existingId) {
      const existingDeck = st0.peopleDecks.find((d) => d.id === existingId);
      if (existingDeck) return existingId;
    }

    const selectedTopic =
      TOPICS.find((t) => t.id === selectedTopicId) ?? TOPICS[0];

    if (!selectedTopic) return null;

    // Create a complete People Mode deck automatically for this topic.
    st0.seedIfNeeded();

    st0.startPeopleDraft({
      anchorText: selectedTopic.anchor,
      topicId: selectedTopic.id,
    });

    // Re-fetch after startPeopleDraft (zustand set is sync, but this is safe).
    const st1 = usePrototypeStore.getState();

    for (const lens of ORDER) {
      const cands = st1.getCandidatesForDraft(lens);
      const pick = cands?.[0];
      if (!pick) {
        // Clear the draft so we don't leave partial state around.
        st1.clearDraftPeopleDeck();
        return null;
      }
      st1.lockDraftMatch(lens, pick.id);
    }

    const published = st1.publishDraftPeopleDeck();
    if (!published) return null;

    setDemoDeckIds((prev) => ({ ...prev, [selectedTopicId]: published.id }));
    return published.id;
  }

  function startDemoRoom() {
    setError(null);

    if (!topic) {
      setError("No demo topic selected.");
      return;
    }

    const deckId = getOrCreateDemoDeckId(topic.id);
    if (!deckId) {
      setError(
        "Could not create a demo People deck for this topic. Try a different topic."
      );
      return;
    }

    const deck = usePrototypeStore
      .getState()
      .peopleDecks.find((d) => d.id === deckId);

    if (!deck) {
      setError("Demo deck missing after creation. Try refreshing once.");
      return;
    }

    const title = roomTitle.trim() || topic.label;

    const room = createRoomFromDeck({
      title,
      rawDeck: deck,
    });

    // Avoid full reload so tutorial mode stays active.
    router.push(`/prototype/rooms/${room.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <div className="text-xs text-slate-500">Tutorial · Backroom Mode</div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Backroom Mode
          </h1>
          <p className="text-slate-600">
            Backroom Mode turns a complete People Mode deck into a Room where a
            group can chat and generate a transcript-bound solution.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
            <Link href="/tutorial" className="rounded-full border border-slate-200 bg-white px-4 py-2">
              Tutorial Home
            </Link>
            <Link href="/feed" className="rounded-full border border-slate-200 bg-white px-4 py-2">
              MVP Feed
            </Link>
            <Link href="/create" className="rounded-full border border-slate-200 bg-white px-4 py-2">
              MVP Add Flip
            </Link>
            <Link href="/prototype/people-mode" className="rounded-full border border-slate-200 bg-white px-4 py-2">
              People Mode Builder
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="text-sm font-medium text-slate-900">
            Step 1 — Choose a demo topic
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-600">Prototype topic pool</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="text-xs text-slate-500 mb-2">Anchor post</div>
            <div className="font-medium">{topic?.anchor}</div>
          </div>

          <div className="text-sm font-medium text-slate-900 pt-2">
            Step 2 — Create a Room from the demo deck
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-600">Room title (the “problem”)</label>
            <input
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder={`e.g., How should we handle “${topic?.label ?? "this"}”?`}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <div className="text-xs text-slate-500">
              Tip: the title should be a solvable question. The solution will be constrained to seed + chat only.
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={startDemoRoom}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Use demo deck → Create Room
            </button>

            <Link
              href="/prototype/people-mode"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-900"
            >
              Build your own People deck
            </Link>

            <Link
              href="/prototype/rooms"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-900"
            >
              View Rooms feed
            </Link>
          </div>

          <div className="pt-2 text-xs text-slate-500">
            This tutorial auto-creates a complete People Mode deck behind the scenes so you can jump straight into a Room.
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="text-sm font-medium text-slate-900">What happens next</div>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>You’ll see seed messages (anchor + 5 lenses) at the top of the Room chat.</li>
            <li>Add messages to explore the issue together.</li>
            <li>The “AI Solution” is transcript-bound and cites message numbers.</li>
          </ul>
          <div className="text-xs text-slate-500">
            Demo decks created this way are stored locally (prototype-only).
          </div>
        </section>

        <section className="text-center text-sm text-slate-500">
          {peopleDecks.length > 0 ? (
            <span>{peopleDecks.length} People deck(s) in prototype storage.</span>
          ) : (
            <span>No People decks in prototype storage yet.</span>
          )}
        </section>
      </div>
    </div>
  );
}
