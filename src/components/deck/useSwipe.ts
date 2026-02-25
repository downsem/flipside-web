"use client";

import { useRef } from "react";

export function useSwipe(opts: {
  onLeft: () => void;
  onRight: () => void;
  threshold?: number;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const threshold = opts.threshold ?? 40;

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startY.current = e.clientY;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (startX.current == null || startY.current == null) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // ignore mostly-vertical gestures
    if (Math.abs(dy) > Math.abs(dx)) {
      startX.current = null;
      startY.current = null;
      return;
    }

    if (dx <= -threshold) opts.onLeft();
    if (dx >= threshold) opts.onRight();

    startX.current = null;
    startY.current = null;
  }

  return { onPointerDown, onPointerUp };
}
