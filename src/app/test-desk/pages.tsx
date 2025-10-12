"use client";

import SwipeDeck from "@/components/SwipeDeck";

const demoFlips = [
  {
    flip_id: "1",
    original: "Original text",
    candidates: [{ candidate_id: "a", text: "Rewritten" }],
  },
  {
    flip_id: "2",
    original: "Another original",
    candidates: [{ candidate_id: "b", text: "Another rewrite" }],
  },
];

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">SwipeDeck demo</h1>
      <SwipeDeck initialFlips={demoFlips} />
    </main>
  );
}
