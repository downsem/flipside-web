"use client";
import React from "react";
import { useFeedFilter } from "@/context/FeedFilterContext";
import { TIMELINE_LIST } from "@/theme/timelines";

export default function FilterBar({
  onAddFlip,
}: { onAddFlip?: () => void }) {
  const { selectedPrompt, setSelectedPrompt } = useFeedFilter();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Add Flip (left) */}
      <button
        onClick={onAddFlip}
        className="px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-neutral-50 text-sm"
      >
        ➕ Add Flip
      </button>

      {/* Filter (right) */}
      <div className="ml-auto">
        <select
          value={selectedPrompt ?? ""}
          onChange={(e) =>
            setSelectedPrompt(e.target.value ? (e.target.value as any) : null)
          }
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm"
        >
          <option value="">All prompts</option>
          {TIMELINE_LIST.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
