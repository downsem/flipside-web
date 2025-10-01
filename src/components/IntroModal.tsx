// src/components/IntroModal.tsx
"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "flipside.intro.seen.v1";

export default function IntroModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">How FlipSide Works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Read the original post at the top.</li>
          <li>Swipe through AI “flips” (rewrites/counterpoints).</li>
          <li>Swipe right 👍 if a flip helps; left 👎 if it doesn’t.</li>
          <li>After you finish, you’ll see which styles worked best.</li>
        </ol>
        <button
          onClick={close}
          className="w-full rounded-xl bg-black text-white py-2 hover:bg-gray-800"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
