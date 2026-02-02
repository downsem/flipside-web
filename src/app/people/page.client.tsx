"use client";

import Link from "next/link";
import { useEffect } from "react";
import { activatePeopleMode } from "@/people/mode";

export default function PeopleHomeClient() {
  useEffect(() => {
    activatePeopleMode();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">People Mode</div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Try People Mode
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Build a deck by matching one “anchor” post with five different lenses.
              When you’re done, your deck appears in the People Feed.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/feed"
              className="text-sm underline text-slate-700"
            >
              MVP Feed
            </Link>
            <Link
              href="/"
              className="text-sm underline text-slate-700"
            >
              MVP Add Flip
            </Link>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-slate-900">1) Build a deck</div>
            <div className="text-sm text-slate-600">
              Start with a preloaded anchor (or write your own), then lock in one match per lens.
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/prototype/people-mode"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Build a deck
              </Link>
              <Link
                href="/prototype/people-mode?demo=1"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Use demo deck
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-slate-900">2) Explore People Feed</div>
            <div className="text-sm text-slate-600">
              Browse published decks in a newsfeed-style list. Each deck includes a “Start Room” button for the deck owner.
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/prototype?published=1"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                People Feed
              </Link>
              <Link
                href="/prototype"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                All decks
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">What to do in a Room</div>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl">
            After you start a Room from a published deck, the first messages are seeded from the deck.
            Use those to kick off the conversation, add your own messages, and (later) generate an AI solution
            that cites message numbers.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/prototype/rooms"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Rooms feed
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
