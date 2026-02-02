"use client";

import Link from "next/link";

export default function PeopleTutorialClient() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Tutorial · People Mode</div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Build a People Mode deck
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              People Mode is a prototype sandbox (local-only). You’ll curate an <span className="font-medium">Anchor</span> post and lock 5 matched posts — one per lens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/tutorial" className="text-sm underline text-slate-700">
              Tutorial home
            </Link>
            <Link href="/prototype" className="text-sm underline text-slate-700">
              Prototype feed
            </Link>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="text-lg font-semibold text-slate-900">What you’ll do</div>

          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            <li>
              Go to <span className="font-medium">Add Flip (prototype)</span> and write your anchor post.
            </li>
            <li>
              Ensure <span className="font-medium">People</span> is selected, then click <span className="font-medium">Next</span>.
            </li>
            <li>
              In the builder, choose a lens, swipe through candidates, and click <span className="font-medium">Lock ✅</span>.
            </li>
            <li>
              Repeat until you have <span className="font-medium">5/5</span> locked.
            </li>
            <li>
              Click <span className="font-medium">Publish</span> to publish the deck, then click <span className="font-medium">Start Room</span> to enter Backroom Mode.
            </li>
          </ol>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Tip: Use the keyboard shortcuts in the builder — <span className="font-medium">left/right</span> to cycle candidates, <span className="font-medium">Enter</span> to lock.
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/prototype/create"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Launch People Mode sandbox →
            </Link>
            <Link
              href="/tutorial/backroom"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Next: Backroom Mode tutorial →
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Finish the tutorial</div>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            When you’re done exploring People Mode, jump back into the real app to create a Flip and browse the live Feed.
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
