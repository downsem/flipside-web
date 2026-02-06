"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/prototype/people/store";
import { TOPICS } from "@/prototype/people/mockData";

export default function CreatePrototypeClient() {
  const router = useRouter();

  const seedIfNeeded = usePrototypeStore((s) => s.seedIfNeeded);
  const startPeopleDraft = usePrototypeStore((s) => s.startPeopleDraft);

  const [mode, setMode] = useState<"people" | "ai">("people"); // default People
  const [text, setText] = useState("");
  const [lastAutoText, setLastAutoText] = useState<string | null>(null);
  const [topicId, setTopicId] = useState(TOPICS[0]?.id ?? "t01");

  const selectedTopic = useMemo(() => {
    return TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];
  }, [topicId]);


  useEffect(() => {
    seedIfNeeded();
  }, [seedIfNeeded]);

  // Tutorial: preload a demo Flip based on the selected topic pool
  useEffect(() => {
    if (mode !== "people") return;
    const demo = selectedTopic?.anchor ?? "";
    if (!demo) return;
    // Only auto-fill if the user hasn't typed their own text (or is still on the last auto-filled demo)
    if ((text.trim().length === 0 || (lastAutoText && text === lastAutoText)) && text !== demo) {
      setText(demo);
      setLastAutoText(demo);
    }
  }, [mode, selectedTopic, text, lastAutoText]);


  const chars = text.length;

  const canNext = useMemo(() => {
    return text.trim().length > 0;
  }, [text]);

  function onNext() {
    if (!canNext) return;

    if (mode === "ai") {
      // We are not mocking AI creation here.
      router.push("/");
      return;
    }

    startPeopleDraft({ anchorText: text.trim(), topicId });

    // IMPORTANT: client-side nav keeps zustand state
    router.push("/prototype/people-mode");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Add Flip</h1>
            <div className="mt-2 text-slate-500">Posting as Ethan Downs</div>
          </div>

          <Link href="/prototype" className="text-sm underline text-slate-700">
            Back to feed
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">Mode</div>

            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`px-3 py-1 text-xs rounded-full ${
                  mode === "ai" ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                AI
              </button>
              <button
                type="button"
                onClick={() => setMode("people")}
                className={`px-3 py-1 text-xs rounded-full ${
                  mode === "people" ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                People
              </button>
            </div>
          </div>

          <div className="mt-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write the original post text..."
              className="w-full min-h-[220px] rounded-3xl border border-slate-200 bg-slate-50 px-6 py-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="mt-2 text-xs text-slate-500">{chars} chars</div>
          </div>

          {mode === "people" && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Prototype topic pool
                </div>
                <div className="text-xs text-slate-500">
                  Controls which candidate sets you see in the People builder.
                </div>
              </div>

              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800"
              >
                {TOPICS.map((t, idx) => (
                  <option key={t.id} value={t.id}>
                    {idx + 1}. {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className={`rounded-full px-10 py-4 text-lg font-semibold ${
                canNext
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              {mode === "people" ? "Next" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}