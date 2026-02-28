import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-neutral-200 bg-white",
        "p-[var(--space-4)]",
        className
      )}
      {...props}
    />
  );
}
