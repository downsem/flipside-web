// src/app/mock/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";

/**
 * TIMELINES: local mock of your theme presets.
 * We apply bg/accent/text as CSS vars to simulate theming.
 */
const TL = {
  calm: {
    id: "calm",
    label: "Calm-Constructive",
    colors: { bg: "#B7E2F6", accent: "#F5F9FB", text: "#1E2A1E" },
  },
  bridge: {
    id: "bridge",
    label: "Balanced-Bridge",
    colors: { bg: "#C3D9B0", accent: "#F4EBD0", text: "#283028" },
  },
  // ✅ Reworked for accessibility: dark slate bg + card; high-contrast text.
  // Keeps a "neon-ish" vibe without neon-on-neon.
  cynical: {
    id: "cynical",
    label: "Cynical-Wit",
    colors: { bg: "#0F1115", accent: "#161A1F", text: "#F2F7E8" },
  },
  opposite: {
    id: "opposite",
    label: "Opposite-Perspective",
    colors: { bg: "#C0392B", accent: "#FFF7F3", text: "#2B1A1A" },
  },
  playful: {
    id: "playful",
    label: "Playful-Satirical",
    colors: { bg: "#D9B3FF", accent: "#FF69B4", text: "#2D0030" },
  },
} as const;

type TimelineId = keyof typeof TL;

type Flip = {
  id: string;
  promptKind: TimelineId;          // lens id
  text: string;                    // rewritten text
};

const ORIGINAL_TEXT = `If Republicans want to blame their shutdown on me, they are more than
welcome to come to my office and negotiate anytime.

Unlike them, I won’t let kids and hard working people get cut off their insulin
and chemo on my watch.

They know it, too. Door’s open fellas. Your call.`.replace(/\n\n/g, "\n\n");

const MOCK_FLIPS: Flip[] = [
  { id: "f1", promptKind: "calm", text: "I’m open to negotiation at any time and focused on ensuring people keep access to essential medications like insulin and chemotherapy. The door is open for a constructive discussion." },
  { id: "f2", promptKind: "bridge", text: "Let’s acknowledge concerns on both sides and meet to find a practical path that protects essential care while moving forward together." },
  { id: "f3", promptKind: "cynical", text: "Sure, let’s call it a shutdown and pretend negotiations are impossible—until we actually try one." },
  { id: "f4", promptKind: "opposite", text: "This policy could create clarity and consistency, ensuring resources are spent responsibly while still protecting critical treatments." },
  { id: "f5", promptKind: "playful", text: "The door’s open—please wipe your feet and bring a plan that isn’t held together with duct tape." },
];

type Filter = "all" | TimelineId;

export default function MockPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState(0);   // index in the CURRENT list (depends on filter)
  const [reply, setReply] = useState("");

  // Build the list shown, based on filter
  const list = useMemo(() => {
    if (filter === "all") {
      return [
        { id: "original", promptKind: "original" as const, text: ORIGINAL_TEXT },
        ...MOCK_FLIPS,
      ] as const;
    }
    return MOCK_FLIPS.filter(f => f.promptKind === filter);
  }, [filter]);

  // Which "card" is visible right now?
  const current = list[index];

  // Decide which theme to apply to the page:
  // - In "all": original uses neutral; flips use their lens.
  // - In filtered: the filter lens is pinned.
  const activeTheme: TimelineId | "neutral" = useMemo(() => {
    if (filter !== "all") return filter;
    if (current && current.id === "original") return "neutral";
    if (current && "promptKind" in current) {
      const id = (current as any).promptKind as TimelineId;
      return id;
    }
    return "neutral";
  }, [filter, current]);

  // Apply CSS vars for theme
  useEffect(() => {
    const root = document.documentElement;
    if (activeTheme === "neutral") {
      root.style.setProperty("--bg", "#E8F3FA");     // neutral background
      root.style.setProperty("--accent", "#FFFFFF"); // neutral card
      root.style.setProperty("--text", "#111111");
      return;
    }
    const t = TL[activeTheme];
    root.style.setProperty("--bg", t.colors.bg);
    root.style.setProperty("--accent", t.colors.accent);
    root.style.setProperty("--text", t.colors.text);
  }, [activeTheme]);

  const next = () => setIndex(i => Math.min(i + 1, list.length));   // allow i === length to show "done"
  const prev = () => setIndex(i => Math.max(i - 1, 0));

  const atEnd = index >= list.length - 1 && filter !== "all" ? index >= list.length - 1 : index >= list.length;
  const showDone = index >= list.length || list.length === 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <header className="mx-auto max-w-3xl flex items-center justify-between px-4 py-5">
        <h1 className="text-3xl font-semibold">FlipSide</h1>

        <div className="flex items-center gap-3">
          {/* ✅ Add Flip button (mock action) */}
          <button
            onClick={() => alert("Add Flip (mock)")}
            className="rounded-md border border-black/10 bg-white/80 px-3 py-2 text-sm"
            aria-label="Add Flip"
          >
            + Add Flip
          </button>

          {/* Filter dropdown */}
          <label className="text-sm opacity-70 sr-only" htmlFor="filter">
            Filter
          </label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => { setFilter(e.target.value as Filter); setIndex(0); setReply(""); }}
            className="rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm"
            aria-label="Filter flips"
          >
            <option value="all">All</option>
            <option value="calm">{TL.calm.label}</option>
            <option value="bridge">{TL.bridge.label}</option>
            <option value="cynical">{TL.cynical.label}</option>
            <option value="opposite">{TL.opposite.label}</option>
            <option value="playful">{TL.playful.label}</option>
          </select>
        </div>
      </header>

      {/* Card container */}
      <main className="mx-auto max-w-3xl px-4 pb-14">
        <div
          className="rounded-2xl shadow-lg border border-black/10"
          style={{ background: "var(--accent)" }}
        >
          {/* Card header line (Original label only in All mode) */}
          {filter === "all" && current?.id === "original" && (
            <div className="px-5 pt-4 text-sm font-medium opacity-70">Original</div>
          )}

          {/* Card body */}
          <div className="px-5 pb-4 pt-3">
            {!showDone ? (
              <>
                <p className="whitespace-pre-wrap leading-7 text-[1.1rem]">
                  {current?.text}
                </p>

                {/* Actions row */}
                <div className="mt-5 flex items-center gap-2">
                  <button
                    onClick={() => alert("👎 (mock)")}
                    className="rounded-md border border-black/10 px-3 py-2"
                    title="Downvote"
                    aria-label="Downvote"
                  >
                    👎
                  </button>
                  <button
                    onClick={() => alert("👍 (mock)")}
                    className="rounded-md border border-black/10 bg-white/70 px-3 py-2"
                    title="Upvote"
                    aria-label="Upvote"
                  >
                    👍
                  </button>

                  {/* ✅ Prev/Next only visible on md+ (hidden on mobile) */}
                  <div className="ml-auto hidden md:flex gap-2">
                    <button
                      onClick={prev}
                      className="rounded-md border border-black/10 px-3 py-2 text-sm"
                      disabled={index === 0}
                      aria-label="Previous"
                    >
                      Prev
                    </button>
                    <button
                      onClick={next}
                      className="rounded-md border border-black/10 px-3 py-2 text-sm"
                      aria-label={atEnd ? "Finish" : "Next"}
                    >
                      {atEnd ? "Finish" : "Next"}
                    </button>
                  </div>
                </div>

                {/* Simple reply input (MVP) */}
                <div className="mt-4 flex items-center gap-3">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={current?.id === "original" ? "Reply to the original…" : "Reply to this flip…"}
                    className="w-full rounded-md border border-black/10 bg-white/80 px-3 py-2"
                  />
                  <button
                    onClick={() => { alert(`Reply (mock): ${reply || "(empty)"}`); setReply(""); }}
                    className="rounded-md bg-black/80 px-4 py-2 text-white"
                  >
                    Reply
                  </button>
                </div>
              </>
            ) : (
              <div className="grid place-items-center py-16 text-center">
                <div className="text-lg font-medium">That’s everything for this view.</div>
                <div className="mt-1 text-sm opacity-70">
                  {filter === "all"
                    ? "You’ve reached the end of the demo list."
                    : "Try switching the filter to another lens to see more."}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
