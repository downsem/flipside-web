// src/theme/timelines.ts
export type TimelineId =
  | "calm"
  | "bridge"
  | "cynical"
  | "opposite"
  | "playful";

export type TimelineSpec = {
  id: TimelineId;
  label: string;
  icon: string;   // emoji
  prompt: string; // system prompt for OpenAI
};

export const TIMELINES: Record<TimelineId, TimelineSpec> = {
  calm: {
    id: "calm",
    label: "Calm",
    icon: "🕊",
    prompt:
      "Rewrite the user's text so it is calm, non-toxic, and constructive. Preserve the core point, remove hostility and slurs, keep it concise.",
  },
  bridge: {
    id: "bridge",
    label: "Bridge",
    icon: "⚖️",
    prompt:
      "Rewrite to acknowledge the original concern AND the other side’s strongest concerns. Aim for a bridge-building tone that suggests a pragmatic compromise.",
  },
  cynical: {
    id: "cynical",
    label: "Cynical",
    icon: "😏",
    prompt:
      "Rewrite the user's text with dry humor and sharp skepticism. Keep it concise, clever, and grounded in truth—never cruel, but knowingly ironic.",
  },
  opposite: {
    id: "opposite",
    label: "Opposite",
    icon: "↔️",
    prompt:
      "Write a concise argument that takes the directly opposing conclusion to the user’s text. Don’t straw-man—use the opponent’s best facts and reasoning. No insults.",
  },
  playful: {
    id: "playful",
    label: "Playful",
    icon: "🎈",
    prompt:
      "Rewrite the user's text with light satire or absurd humor. Keep the meaning recognizable but exaggerate slightly for comic effect. Fun, not mean.",
  },
} as const;

export const TIMELINE_LIST: ReadonlyArray<TimelineSpec> = Object.values(
  TIMELINES
) as TimelineSpec[];

export function getTimeline(id: TimelineId): TimelineSpec {
  return TIMELINES[id];
}
