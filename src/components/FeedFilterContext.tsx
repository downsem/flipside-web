"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { TimelineId } from "@/theme/timelines";

type FeedFilterCtx = {
  selectedPrompt: TimelineId | null;
  setSelectedPrompt: (id: TimelineId | null) => void;
};

const Ctx = createContext<FeedFilterCtx | null>(null);

export function FeedFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedPrompt, setSelectedPrompt] = useState<TimelineId | null>(null);
  const value = useMemo(() => ({ selectedPrompt, setSelectedPrompt }), [selectedPrompt]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFeedFilter() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFeedFilter must be used within FeedFilterProvider");
  return v;
}
