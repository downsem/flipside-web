import type { TimelineId } from "@/theme/timelines";

export type MvpMockPost = {
  id: string;
  text: string;
  createdAt: number;
  author: { name: string; handle: string };
  sourceType?: string;
  sourceUrl?: string | null;
};

export type MvpMockRewrites = Record<TimelineId, { timelineId: TimelineId; text: string; votes: number }>;

export function generateMockRewrites(original: string): MvpMockRewrites {
  // Keep these intentionally simple and obvious — it's a tutorial, not a model showcase.
  const base = original.trim();
  return {
    calm: {
      timelineId: "calm",
      votes: 0,
      text: `Here’s a calmer version of the same idea:\n\n${base}\n\nWhat’s the core concern, and what would a constructive next step look like?`,
    },
    bridge: {
      timelineId: "bridge",
      votes: 0,
      text: `Here’s a bridge-building version:\n\n${base}\n\nWhat would someone on the other side agree with, and where’s the overlap?`,
    },
    cynical: {
      timelineId: "cynical",
      votes: 0,
      text: `Here’s a more cynical version:\n\n${base}\n\nIf the incentives are misaligned, who benefits and why would this persist?`,
    },
    opposite: {
      timelineId: "opposite",
      votes: 0,
      text: `Here’s an “opposite” version:\n\n${base}\n\nWhat if the reverse were true — what evidence or experience would support that?`,
    },
    playful: {
      timelineId: "playful",
      votes: 0,
      text: `Here’s a playful version:\n\n${base}\n\nImagine this as a meme or a movie scene — what’s the funny-but-true takeaway?`,
    },
  };
}

export function demoAuthor() {
  return { name: "Demo User", handle: "@demo" };
}
