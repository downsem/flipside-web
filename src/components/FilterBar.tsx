// src/components/FilterBar.tsx
"use client";

import React from "react";
import { TIMELINE_LIST, type TimelineId } from "@/theme/timelines";
import { useFeedFilter } from "./FeedFilterContext";

export default function FilterBar() {
  const { filter, setFilter } = useFeedFilter();

  return (
    <div className="flex items-center gap-3">
      <select
        value={filter ?? ""}
        onChange={(e) => {
          const v = e.target.value as TimelineId | "";
          setFilter(v === "" ? null : (v as TimelineId));
        }}
        className="rounded-2xl border px-3 py-2 text-sm bg-white"
        aria-label="Filter feed by lens"
      >
        {/* Default / none */}
        <option value="">Default (All)</option>
        {TIMELINE_LIST.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
