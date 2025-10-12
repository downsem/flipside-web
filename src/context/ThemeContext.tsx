"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Use a RELATIVE import to avoid alias/tsconfig hiccups
import { TIMELINES, type TimelineId, type TimelineSpec } from "../theme/timelines";

type ThemeCtx = {
  timelineId: TimelineId;
  theme: TimelineSpec;
  setTimeline: (id: TimelineId) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

const DEFAULT_TIMELINE: TimelineId = "calm";
const STORAGE_KEY = "flipside.timelineId";

// Safe fallback so we never crash if TIMELINES is missing or empty at runtime
const FALLBACK_THEME: TimelineSpec = {
  id: "calm",
  label: "Calm-Constructive",
  icon: "🕊",
  prompt: "",
  colors: { bg: "#ffffff", accent: "#f5f5f5", text: "#111111", patternOpacity: 0.06 },
  assets: { shapeSvg: "", pattern: "" },
  motion: {},
};

function resolveTheme(timelineId: TimelineId): TimelineSpec {
  const map = (TIMELINES ?? {}) as Record<string, TimelineSpec>;
  return map[timelineId] ?? map[DEFAULT_TIMELINE] ?? Object.values(map)[0] ?? FALLBACK_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [timelineId, setTimelineId] = useState<TimelineId>(DEFAULT_TIMELINE);

  // Load saved timeline on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem(STORAGE_KEY) as TimelineId | null) ?? null;
    if (saved && (TIMELINES as any)?.[saved]) setTimelineId(saved);
  }, []);

  const theme = useMemo(() => resolveTheme(timelineId), [timelineId]);

  // Sync CSS vars + persist selection
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-theme", timelineId);
      root.style.setProperty("--bg", theme.colors.bg);
      root.style.setProperty("--accent", theme.colors.accent);
      root.style.setProperty("--text", theme.colors.text);
      root.style.setProperty("--pattern-opacity", String(theme.colors.patternOpacity ?? 0.06));

      if (theme.assets.pattern && theme.assets.pattern.length > 0) {
        root.style.setProperty("--pattern-url", `url(${theme.assets.pattern})`);
      } else {
        root.style.removeProperty("--pattern-url");
      }
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, timelineId);
    }
  }, [timelineId, theme]);

  // Keep multiple tabs/windows in sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const incoming = e.newValue as TimelineId;
        if ((TIMELINES as any)?.[incoming]) setTimelineId(incoming);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTimeline = (id: TimelineId) => setTimelineId(id);

  const value = useMemo(() => ({ timelineId, theme, setTimeline }), [timelineId, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
