"use client";

import Link from "next/link";

export default function BackroomTutorialClient() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Tutorial · Backroom Mode</div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Start a Room from a deck
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Backroom Mode is a prototype sandbox that turns a completed People Mode deck into a Room with seed + chat,
              then generates a transcript-only solution prompt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/tutorial" className="text-sm underline text-slate-700">
              Tutorial home
            </Link>
            <Link href="/prototype/rooms" className="text-sm underline text-slate-700">
              Rooms list
            </Link>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="text-lg font-semibold text-slate-900">What you’ll do</div>

          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            <li>
              From the People Mode builder, click <span className="font-medium">Start Room</span> (this stores the deck
              snapshot).
            </li>
            <li>
              Give the Room a title (a solvable question), then click <span className="font-medium">Create Room →</span>.
            </li>
            <li>
              Use the <span className="font-medium">Chat</span> tab to add messages.
            </li>
            <li>
              Check <span className="font-medium">Prompt preview</span> to see the strict “transcript-only” rules and
              message-numbered transcript.
            </li>
            <li>
              (Optional) In <span className="font-medium">AI Solution (stub)</span>, paste a draft solution to simulate
              iteration.
            </li>
          </ol>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            If you see “No deck found,” go back and complete a People Mode deck first.
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/prototype/rooms/new"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Launch Backroom sandbox →
            </Link>
            <Link
              href="/tutorial/people"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Back to People Mode tutorial
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Finish the tutorial</div>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            When you’re done exploring Backroom Mode, jump back into the real app to create a Flip and browse the live
            Feed.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add a real Flip →
            </Link>
            <Link
              href="/feed"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Go to real Feed →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
