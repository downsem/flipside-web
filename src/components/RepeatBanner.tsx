// src/components/RepeatBanner.tsx
"use client";
import { useEffect, useState } from "react";

export default function RepeatBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 px-4 z-40">
      <div className="max-w-lg mx-auto bg-black text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center justify-between">
        <span>Remember: Read the original post, then swipe the flips 👍👎</span>
        <button
          onClick={() => setShow(false)}
          className="ml-4 rounded-full bg-white text-black px-2 py-0.5 text-xs font-medium hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
