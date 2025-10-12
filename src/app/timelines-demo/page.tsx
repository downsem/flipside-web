import TimelineSelector from "@/components/TimelineSelector";
import SwipeDeck from "@/components/SwipeDeck";

const demoFlips = [
  {
    flip_id: "demo1",
    original: "I’m sick of hearing about this. Nothing ever changes.",
    candidates: [
      {
        candidate_id: "c1",
        text: "Demo rewrite will appear here for the active timeline.",
      },
    ],
  },
  {
    flip_id: "demo2",
    original: "This is the only right answer and everyone else is wrong.",
    candidates: [{ candidate_id: "c2", text: "Another demo rewrite goes here." }],
  },
];

export default function Page() {
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FlipSide Timelines Demo</h1>
        <TimelineSelector />
      </div>

      <p className="opacity-70">
        Select a timeline above. Swipe right/left on the card to simulate feedback and see theme effects.
      </p>

      <SwipeDeck initialFlips={demoFlips} />
    </main>
  );
}
