"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/prototype/people/store";
import { TOPICS } from "@/prototype/people/mockData";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    if (
      (text.trim().length === 0 || (lastAutoText && text === lastAutoText)) &&
      text !== demo
    ) {
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
    <AppShell
      title="People Mode"
      headerRight={
        <div className="flex items-center gap-2">
          <Link href="/prototype">
            <Button size="sm" variant="ghost" className="whitespace-nowrap">
              Decks
            </Button>
          </Link>
          <Link href="/feed">
            <Button size="sm" variant="ghost" className="whitespace-nowrap">
              Exit
            </Button>
          </Link>
        </div>
      }
    >
      {/* People Mode explainer */}
      {mode === "people" && (
        <div className="mb-4">
          <p className="text-sm text-neutral-700">
            <span className="font-medium">People Mode</span> is the social
            version of Flipside: instead of AI generating perspectives, you
            match your post with real posts from other people talking about the
            same topic from different angles.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Prototype note: this is running on placeholder/demo data so you can
            try the flow end-to-end.
          </p>
        </div>
      )}

      <Card className="shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-[var(--text-md)] font-semibold text-neutral-900">
            Mode
          </div>

          <div className="inline-flex rounded-[var(--radius-pill)] border border-neutral-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`px-3 py-1 text-xs rounded-[var(--radius-pill)] ${
                mode === "ai" ? "bg-neutral-900 text-white" : "text-neutral-700"
              }`}
            >
              AI
            </button>
            <button
              type="button"
              onClick={() => setMode("people")}
              className={`px-3 py-1 text-xs rounded-[var(--radius-pill)] ${
                mode === "people"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700"
              }`}
            >
              People
            </button>
          </div>
        </div>

        <div className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or write the original post text..."
            className="w-full min-h-[220px] rounded-[var(--radius-card)] border border-neutral-200 bg-neutral-50 px-4 py-4 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
          <div className="mt-2 text-xs text-neutral-500">{chars} chars</div>
        </div>

        {mode === "people" && (
          <div className="mt-4 rounded-[var(--radius-card)] border border-neutral-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900">
                  Prototype topic pool
                </div>
                <div className="text-xs text-neutral-500">
                  Controls which candidate sets you see in the People builder.
                </div>
              </div>
              <div className="w-full sm:w-[320px]">
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full rounded-[var(--radius-pill)] border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900"
                >
                  {TOPICS.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      {idx + 1}. {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button onClick={onNext} disabled={!canNext} className="w-full">
            {mode === "people" ? "Next" : "Post"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
