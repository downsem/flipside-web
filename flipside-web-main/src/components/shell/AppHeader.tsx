"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function AppHeader({
  title,
  leftSlot,
  rightSlot,
  sticky = true,
}: {
  title: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        "z-30 w-full border-b border-neutral-200 bg-white/90 backdrop-blur",
        sticky && "sticky top-0"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="min-w-0 flex items-center gap-2">
          {leftSlot}
          <div className="truncate text-[var(--text-lg)] font-semibold">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
