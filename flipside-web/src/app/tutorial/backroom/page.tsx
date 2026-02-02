// src/app/tutorial/backroom/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TOPICS } from "@/prototype/people/mockData";
import { usePrototypeStore } from "@/prototype/people/store";
import { createRoomFromDeck } from "@/prototype/rooms/store";
import type { PeopleDeckPublished } from "@/prototype/people/types";
import { activateTutorial } from "@/tutorial/mode";

export default function BackroomTutorialPage() {
  const router = useRouter();

  // Subscribe to decks so UI updates after seeding.
  const peopleDecks = usePrototypeStore((s) => s.peopleDecks);

  const [topicId, setTopicId] = useState<string>(TOPICS[0]?.id ?? "t01");
  const [roomTitle, setRoomTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure tutorial mode is on when entering from anywhere.
    activateTutorial();

    // Seed prototype demo content (posts + demo decks) if needed.
    // NOTE: seedIfNeeded is part of the zustand store state, not a named export.
    usePrototypeStore.getState().seedIfNeeded();
  }, []);

  const topic = useMemo(() => {
    return TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];
  }, [topicId]);

  const demoDeckId = useMemo(() => {
    return topic ? `deck_demo_${topic.id}` : "";
  }, [topic]);

  const demoDeck = useMemo(() => {
    return peopleDecks.find((d) => d.id === demoDeckId) as PeopleDeckPublished | undefined;
  }, [peopleDecks, demoDeckId]);

  function startDemoRoom() {
    setError(null);

    if (!topic) {
      setError("No demo topic selected.");
      return;
    }

    let deck = demoDeck;
    if (!deck) {
      // Try reseeding once (in case local storage/state was cleared).
      usePrototypeStore.getState().seedIfNeeded();
      deck = usePrototypeStore.getState().peopleDecks.find(
        (d) => d.id === `deck_demo_${topic.id}`
      ) as PeopleDeckPublished | undefined;
    }

    if (!deck) {
      setError(
        "Demo deck not found yet. Try refreshing the page once, or pick a different topic."
      );
      return;
    }

    const title = roomTitle.trim() || topic.label;

    const room = createRoomFromDeck({
      title,
      rawDeck: deck,
    });

    // Use router.push (avoid full reload) so in-memory UI state isn't reset.
    router.push(`/prototype/rooms/${room.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="text-xs text-slate-500">Tutorial · Backroom Mode</div>
          <h1 className="text-3xl font-semibold text-slate-900">Start a demo Room</h1>
          <p className="text-sm text-slate-600">
            Pick a demo topic and we’ll open a Room that’s already seeded from a completed
            People Mode deck. No setup — just click through the Backroom flow.
          </p>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">1) Choose a demo topic</div>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                This selects a prebuilt People Mode deck (5/5 locked) for the topic.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">2) Room title (optional)</div>
              <input
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder={topic ? topic.label : "Room title"}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div className="text-xs text-slate-500">Leave blank to use the topic name.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-700">What you’ll see</div>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Seed messages</span> (anchor + 5 lenses) are
              injected into the chat automatically.
            </div>
            {topic?.anchor ? (
              <div className="mt-3 text-sm text-slate-700">
                <div className="text-xs text-slate-500">Anchor post</div>
                <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-3">
                  {topic.anchor}
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={startDemoRoom}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Start demo Room
            </button>

            <Link
              href="/prototype/rooms"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Browse Rooms feed
            </Link>

            <Link
              href="/tutorial"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Back to Tutorial Home
            </Link>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Tip: if you ever end up in prototype pages, the tutorial header always includes “Tutorial Home.”
        </div>
      </div>
    </div>
  );
}
