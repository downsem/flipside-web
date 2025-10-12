"use client";

import { useTheme } from "@/context/ThemeContext";
import { TIMELINES } from "@/theme/timelines";

export default function TimelineSelector() {
  const { timelineId, setTimeline } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {Object.values(TIMELINES).map((t) => {
        const active = t.id === timelineId;
        return (
          <button
            key={t.id}
            onClick={() => setTimeline(t.id)}
            className={`px-2 py-1 rounded-md border text-sm flex items-center gap-1 transition ${
              active
                ? "border-black/40"
                : "border-black/10 hover:border-black/30"
            }`}
            style={{
              background: active ? t.colors.accent : "transparent",
              color: active ? "#000" : "inherit",
            }}
            aria-pressed={active}
            title={t.label}
          >
            <span aria-hidden>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
