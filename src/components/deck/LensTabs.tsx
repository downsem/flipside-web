"use client";

import { cn } from "@/lib/cn";

export const LENSES = [
  "Original",
  "Calm",
  "Bridge",
  "Cynical",
  "Opposite",
  "Playful",
] as const;

export type Lens = (typeof LENSES)[number];

export function LensTabs({
  value,
  onChange,
  index,
  sticky = false,
  className,
}: {
  value: Lens;
  onChange: (lens: Lens) => void;
  index: number; // 0..LENSES.length-1
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "z-20 -mx-4 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur",
        sticky && "sticky top-14",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {LENSES.map((lens) => {
            const active = lens === value;
            return (
              <button
                key={lens}
                onClick={() => onChange(lens)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-2",
                  "text-[var(--text-sm)] min-h-[44px]",
                  active
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-700"
                )}
              >
                {lens}
              </button>
            );
          })}
        </div>
        <div className="shrink-0 text-[var(--text-sm)] text-neutral-600">
          {index + 1}/{LENSES.length}
        </div>
      </div>
    </div>
  );
}
