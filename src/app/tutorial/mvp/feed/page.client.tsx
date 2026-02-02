"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TimelineId } from "@/theme/timelines";
import PostCardMock from "@/tutorial/mvp/PostCardMock";
import {
  clearMvpTutorialState,
  loadMvpTutorialState,
  type MvpTutorialState,
} from "@/tutorial/mvp/storage";

type Filter = "all" | TimelineId;

export default function MvpTutorialFeedClient() {
  const router = useRouter();
  const [state, setState] = useState<MvpTutorialState | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setState(loadMvpTutorialState());
  }, []);

  function restart() {
    clearMvpTutorialState();
    router.push("/tutorial/mvp/add");
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">
            No demo Flip found
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Start the MVP tutorial from the Add screen.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/tutorial/mvp/add" className="text-sm underline text-slate-700">
              Go to MVP tutorial
            </Link>
            <Link href="/tutorial" className="text-sm underline text-slate-700">
              Tutorial home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            FS
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              MVP Tutorial
            </span>
            <span className="text-[10px] text-slate-500">
              Step 2/2: Explore the five lenses.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-600">
            <span>Choose your timeline:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="all">All</option>
            <option value="calm">Calm</option>
            <option value="bridge">Bridge</option>
            <option value="cynical">Cynical</option>
            <option value="opposite">Opposite</option>
            <option value="playful">Playful</option>
          </select>

          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 text-[11px] font-medium shadow-sm px-2 py-1 sm:px-3"
          >
            <span className="sm:hidden">↺</span>
            <span className="hidden sm:inline">Restart</span>
          </button>

          <Link
            href="/tutorial"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 text-[11px] font-medium shadow-sm px-2 py-1 sm:px-3"
          >
            <span className="sm:hidden">Home</span>
            <span className="hidden sm:inline">Tutorial home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="font-medium">Try these:</div>
          <ul className="mt-1 list-disc pl-5 text-sm">
            <li>Use the arrows on the card to move across lenses.</li>
            <li>Or use the timeline filter above to view a single lens.</li>
            <li>Vote 👍/👎 and add a reply (sandbox-only).</li>
            <li>Click “Share lens” to see what gets shared.</li>
          </ul>
        </div>

        <PostCardMock post={state.post} rewrites={state.rewrites} selectedTimeline={filter} />

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">Finish the MVP tutorial</div>
          <p className="mt-1 text-sm text-slate-600">
            Ready to try the real app? Your demo actions above weren’t saved — now you can create a real Flip
            and explore the live Feed.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
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
            <Link href="/tutorial" className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-700 underline">
              Back to tutorial home
            </Link>
          </div>
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <Link href="/tutorial/mvp/add" className="underline">
            ← Back to Step 1
          </Link>
          <Link href="/tutorial" className="underline">
            Done — tutorial home →
          </Link>
        </div>
      </main>
    </div>
  );
}
