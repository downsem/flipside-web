// src/app/prototype/rooms/new/page.client.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isPeopleModeActive, onPeopleModeChange } from "@/people/mode";
import { buildMockPosts, TOPICS } from "@/prototype/people/mockData";
import {
  ROOM_SEED_KEY,
  createRoomFromDeck,
  deckToSnapshot,
} from "@/prototype/rooms/store";

export default function NewRoomClient() {
  const [rawDeck, setRawDeck] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [tutorialActive, setTutorialActive] = useState(false);

  useEffect(() => {
    setTutorialActive(isPeopleModeActive());
    return onPeopleModeChange(() => setTutorialActive(isPeopleModeActive()));
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem(ROOM_SEED_KEY);
    if (!s) return;
    try {
      setRawDeck(JSON.parse(s));
    } catch {
      setRawDeck(null);
    }
  }, []);

  const snapshot = useMemo(() => {
    if (!rawDeck) return null;
    return deckToSnapshot(rawDeck);
  }, [rawDeck]);

  function loadDemoDeck() {
    const posts = buildMockPosts();
    const topic = TOPICS?.[0];
    if (!topic || posts.length === 0) return;

    const pick = (lens: string) =>
      posts.find((p: any) => p.topicId === topic.id && p.lensLabel === lens) ??
      posts.find((p: any) => p.lensLabel === lens) ??
      posts[0];

    const deck = {
      id: "draft_demo_room",
      ownerUserId: "u_demo",
      anchorText: topic.anchor,
      topicId: topic.id,
      createdAt: Date.now(),
      locked: {
        calm: pick("calm"),
        bridge: pick("bridge"),
        cynical: pick("cynical"),
        opposite: pick("opposite"),
        playful: pick("playful"),
      },
    };

    sessionStorage.setItem(ROOM_SEED_KEY, JSON.stringify(deck));
    setRawDeck(deck);
  }

  function create() {
    if (!rawDeck) return;
    const room = createRoomFromDeck({ title, rawDeck });
    // optional: clear the seed so you don't accidentally reuse it
    sessionStorage.removeItem(ROOM_SEED_KEY);
    window.location.href = `/prototype/rooms/${room.id}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Prototype · Rooms</div>
            <h1 className="text-2xl font-semibold text-slate-900">Create a Room</h1>
            <p className="text-sm text-slate-600 mt-1">
              This converts a completed People Mode deck into a Room.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/prototype/rooms" className="text-sm underline text-slate-700">
              Back to Rooms
            </Link>
          </div>
        </header>

        {!snapshot && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-lg font-semibold text-slate-900">No deck found</div>
            <p className="mt-2 text-sm text-slate-600">
              Go to People Mode, complete a deck (5/5 locked), then click “Start Room.”
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/prototype/people-mode"
                className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Go to People Mode
              </Link>

              {tutorialActive && (
                <button
                  onClick={loadDemoDeck}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Use demo deck
                </button>
              )}
            </div>
          </div>
        )}

        {snapshot && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="text-base font-semibold text-slate-900">Room title (the “problem”)</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How should we handle ____ given ____?"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
            <div className="text-xs text-slate-500">
              Tip: title should be a solvable question. The solution will be constrained to seed + chat only.
            </div>

            <button
              onClick={create}
              disabled={!title.trim()}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600"
            >
              Create Room →
            </button>

            <div className="text-xs text-slate-500">
              Seed messages will appear inside the chat (no separate deck preview).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
