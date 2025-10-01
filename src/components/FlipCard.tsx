// src/components/FlipCard.tsx
"use client";
import React from "react";

export default function FlipCard({
  text,
  index,
  total,
}: {
  text: string;
  index?: number; // current flip number
  total?: number; // total flips for this post
}) {
  return (
    <div className="w-full h-full">
      <div className="h-full rounded-2xl border bg-white p-4 shadow-sm flex flex-col justify-between">
        <p className="text-lg leading-7 whitespace-pre-wrap my-auto">{text}</p>

        {typeof index === "number" && typeof total === "number" && (
          <div className="text-sm text-gray-400 mt-4 text-right">
            Flip {index + 1} of {total}
          </div>
        )}
      </div>
    </div>
  );
}
