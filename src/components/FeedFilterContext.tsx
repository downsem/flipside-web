// src/components/FeedFilterContext.tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import type { TimelineId } from "@/theme/timelines";

type FilterValue = TimelineId | null;

type Ctx = {
  filter: FilterValue;               // null = Default(All) => Original + all lenses
  setFilter: (v: FilterValue) => void;
};

const FeedFilterContext = createContext<Ctx>({
  filter: null,
  setFilter: () => {},
});

export const FeedFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filter, setFilter] = useState<FilterValue>(null);
  return (
    <FeedFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </FeedFilterContext.Provider>
  );
};

export const useFeedFilter = () => useContext(FeedFilterContext);
