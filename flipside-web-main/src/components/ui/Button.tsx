"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium " +
    "min-h-[var(--tap)] px-4 select-none " +
    "transition active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100";

  const sizes =
    {
      md: "text-[var(--text-md)]",
      sm: "text-[var(--text-sm)] min-h-[44px] px-3",
    }[size] ?? "text-[var(--text-md)]";

  const variants =
    {
      primary:
        "rounded-[var(--radius-pill)] bg-br-primary text-white hover:bg-br-dark",
      secondary:
        "rounded-[var(--radius-pill)] border border-br-border bg-br-white text-br-ink hover:bg-br-neutral",
      ghost:
        "rounded-[var(--radius-pill)] bg-transparent text-br-ink hover:bg-br-white",
    }[variant] ??
    "rounded-[var(--radius-pill)] bg-br-primary text-white hover:bg-br-dark";

  return (
    <button
      className={cn(base, sizes, variants, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Working…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
