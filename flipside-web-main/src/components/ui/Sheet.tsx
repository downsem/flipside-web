"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[24px] bg-white",
          "max-h-[90dvh] overflow-hidden"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-[var(--text-md)] font-semibold">{title}</div>
          <button
            className="rounded-full px-3 py-2 text-neutral-600 hover:bg-neutral-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="overflow-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
