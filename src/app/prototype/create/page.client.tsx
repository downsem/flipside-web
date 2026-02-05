"use client";

import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { usePrototypeStore } from "@/prototype/people/store";
import { TOPICS } from "@/prototype/people/mockData";

type SourceType = "original" | "import-self" | "import-other";

export default function CreatePrototypeClient() {
  const router = useRouter();

  const seedIfNeeded = usePrototypeStore((s) => s.seedIfNeeded);
  const startPeopleDraft = usePrototypeStore((s) => s.startPeopleDraft);

  // ✅ pull seeded posts so we can pick a sample by topic
  const posts = usePrototypeStore((s: any) => s.posts ?? []);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep UI identical to MVP Add Flip
  const [sourceType, setSourceType] = useState<SourceType>("original");
  const [sourceUrl, setSourceUrl] = useState("");

  // Prototype topic pool selector (moved to bottom per request)
  const [topicId, setTopicId] = useState<string>(() => TOPICS?.[0]?.id ?? "general");

  // ✅ prevents overwriting user-typed content
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    // ✅ Preload sample flips for People Mode (candidate pools + demo decks).
    // These are keyed by TOPICS[].id, so they align with the selector below.
    try {
      seedIfNeeded?.();
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topicLabel = useMemo(() => {
    return TOPICS.find((t) => t.id === topicId)?.label ?? "this topic";
  }, [topicId]);

  // ✅ pick a topic-specific sample flip (prefer an "anchor" post: no lensLabel)
  const sampleTextForTopic = useMemo(() => {
    if (!posts?.length) return "";

    // In your mock data: "anchor" is typically a post with no lensLabel
    const anchor =
      posts.find((p: any) => p.topicId === topicId && !p.lensLabel && typeof p.text === "string") ??
      posts.find((p: any) => p.topicId === topicId && typeof p.text === "string");

    if (anchor?.text) return anchor.text;

    // fallback (should rarely hit if your mock data is present)
    return `Hot take about ${topicLabel}…`;
  }, [posts, topicId, topicLabel]);

  // ✅ auto-fill the textarea when topic changes (but don't clobber user input)
  useEffect(() => {
    if (!sampleTextForTopic) return;

    // If user hasn't typed yet OR textbox is empty, inject the sample
    if (!userEdited || text.trim() === "") {
      setText(sampleTextForTopic);
      setUserEdited(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, sampleTextForTopic]);

  function handleSourceTypeChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value as SourceType;
    setSourceType(next);
    if (next === "original") setSourceUrl("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please add some text to flip.");
      return;
    }

    setBusy(true);
    try {
      // ✅ Topic alignment: the People builder filters candidates by this topicId.
      startPeopleDraft({ anchorText: trimmed, topicId });
      router.push("/prototype/people-mode");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const showUrlBox = sourceType !== "original";
  const canSubmit = !!text.trim() && !busy;

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">People Mode</h1>
          </div>
        </header>

        {/* People Mode explainer (prototype-safe) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">What is People Mode?</div>
          <p className="mt-1">
            <span className="font-medium">People Mode</span> is a social version of FlipSide: instead of AI generating
            perspectives, <span className="font-medium">you match</span> your post with real posts from other people
            talking about the <span className="font-medium">same topic</span> from different angles (Calm, Bridge,
            Cynical, Opposite, Playful).
          </p>
          <p className="mt-2">
            <span className="font-medium">AI Mode</span> (the MVP experience) generates those lenses automatically.
            People Mode makes the lenses feel grounded in real voices — and can later turn into a Room.
          </p>
          <div className="mt-2 text-xs text-slate-500">
            Prototype note: People Mode currently uses placeholder / demo data so you can try the flow end-to-end.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source selector (match MVP layout) */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">What are you flipping?</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="original"
                  checked={sourceType === "original"}
                  onChange={handleSourceTypeChange}
                />
                <span>Original thought or post</span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-self"
                  checked={sourceType === "import-self"}
                  onChange={handleSourceTypeChange}
                />
                <span>My post (paste a link)</span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-other"
                  checked={sourceType === "import-other"}
                  onChange={handleSourceTypeChange}
                />
                <span>Someone else’s post (paste a link)</span>
              </label>
            </div>
          </div>

          {/* URL box (match MVP behavior) */}
          {showUrlBox && (
            <div className="space-y-2 text-sm">
              <label className="font-medium">Link</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Paste the post URL…"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                disabled={busy}
              />
              <p className="text-xs text-slate-500">
                (Prototype note) Link import isn’t wired yet — it’s here to keep the UI consistent.
              </p>
            </div>
          )}

          {/* Text box (match MVP styling) */}
          <div className="space-y-2 text-sm">
            <label className="font-medium">Add Flip</label>
            <textarea
              rows={7}
              placeholder="Paste a post, quote, or hot take that needs to be unpacked..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setUserEdited(true);
              }}
              disabled={busy}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-slate-700 px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            {busy ? "Working…" : "Generate Flip"}
          </button>

          {/* CTA box footprint */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Next: you’ll pick the best matches for each lens to publish a People Deck.
              <br />
              <span className="text-slate-500 text-xs">
                (Prototype) Candidates come from placeholder topic pools for now.
              </span>
            </span>
            <Link
              href="/account"
              className="ml-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
            >
              Sign in
            </Link>
          </div>

          {/* Topic selector at bottom */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Prototype topic pool</div>
              <div className="text-xs text-slate-500">
                Controls which placeholder candidate sets you see in the People builder.
              </div>
            </div>

            <select
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                // allow auto-fill to happen on topic switch
                setUserEdited(false);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>
    </div>
  );
}
