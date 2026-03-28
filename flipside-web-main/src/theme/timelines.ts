// src/theme/timelines.ts
// Central timeline definitions (types + presets)

export type TimelineId = "calm" | "bridge" | "cynical" | "opposite" | "playful";

export type TimelineSpec = {
  id: TimelineId;
  label: string;
  icon: string;
  prompt: string;
  colors: {
    bg: string;
    accent: string;
    text: string;
    patternOpacity?: number;
  };
  assets: {
    shapeSvg: string;
    lottie?: string;
    pattern?: string;
  };
  motion: {
    enter?: { opacity?: number; scale?: number };
    animate?: { opacity?: number; scale?: number };
    transition?: {
      type?: "spring" | "tween" | "keyframes";
      stiffness?: number;
      damping?: number;
      duration?: number;
    };
    swipeRightEffect?: "burst" | "confetti" | "flip" | "glow" | "merge";
  };
  haptics?: { pattern?: number[] };
  sound?: { src?: string; volume?: number };
};

export const TIMELINES: Record<TimelineId, TimelineSpec> = {
  calm: {
    id: "calm",
    label: "Calm-Constructive",
    icon: "🕊",
    prompt:
      "Rewrite the user’s text so it is calm, non-toxic, and constructive.\n" +
      "Constraints:\n" +
      "- Keep the core point, remove hostility/insults, no sarcasm.\n" +
      "- 1–3 short sentences. No emojis, no hashtags.\n" +
      "- Replace absolutes (always/never) with more precise language.\n" +
      "- Add one concrete, constructive next step or question (brief).",
    colors: {
      bg: "#B7E2F6",
      accent: "#F5F9FB",
      text: "#1E2A32",
      patternOpacity: 0.06,
    },
    assets: { shapeSvg: "/shapes/calm.svg", pattern: "/patterns/calm.svg" },
    motion: {
      enter: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 60, damping: 14 },
      swipeRightEffect: "glow",
    },
    haptics: { pattern: [10] },
    sound: { src: "/sounds/chime.mp3", volume: 0.25 },
  },

  bridge: {
    id: "bridge",
    label: "Balanced-Bridge",
    icon: "⚖️",
    prompt:
      "Rewrite to acknowledge the original concern AND the other side’s strongest concern.\n" +
      "Constraints:\n" +
      "- 2–3 sentences total. No emojis, no hashtags.\n" +
      "- Sentence 1: state the original concern fairly.\n" +
      "- Sentence 2: steelman the other side’s best concern.\n" +
      "- Sentence 3 (optional): propose a pragmatic compromise/shared goal (one concrete idea).",
    colors: { bg: "#C3D9B0", accent: "#F4EBD0", text: "#283028", patternOpacity: 0.08 },
    assets: { shapeSvg: "/shapes/bridge.svg", pattern: "/patterns/bridge.svg" },
    motion: {
      enter: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 70, damping: 16 },
      swipeRightEffect: "merge",
    },
    haptics: { pattern: [8, 30, 8] },
    sound: { src: "/sounds/wood-click.mp3", volume: 0.25 },
  },

  cynical: {
    id: "cynical",
    label: "Cynical-Wit",
    icon: "😏",
    prompt:
      "Rewrite the user’s text with dry humor and sharp skepticism.\n" +
      "Constraints:\n" +
      "- 1–2 sentences. No emojis, no hashtags.\n" +
      "- Be clever and grounded—aim the skepticism at ideas/claims, not people.\n" +
      "- Include one crisp, ironic punchline or skeptical twist.\n" +
      "- Never cruel, no slurs, no dehumanizing language.",
    colors: { bg: "#111111", accent: "#B6FF66", text: "#F8FAFC", patternOpacity: 0.05 },
    assets: { shapeSvg: "/shapes/cynical.svg", pattern: "/patterns/cynical.svg" },
    motion: {
      enter: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 80, damping: 15 },
      swipeRightEffect: "burst",
    },
    haptics: { pattern: [12] },
    sound: { src: "/sounds/metal-click.mp3", volume: 0.28 },
  },

  opposite: {
    id: "opposite",
    label: "Opposite-Perspective",
    icon: "↔️",
    prompt:
      "Write a concise argument that takes the directly opposing conclusion to the user’s text.\n" +
      "Constraints:\n" +
      "- 2–3 sentences. No emojis, no hashtags.\n" +
      "- Steelman only: use the opponent’s best reasoning; no straw-manning.\n" +
      "- Use calm, matter-of-fact tone; no insults.\n" +
      "- Make the opposing conclusion explicit (but keep it respectful).",
    colors: { bg: "#C0392B", accent: "#FFF7F3", text: "#2B1A1A", patternOpacity: 0.06 },
    assets: { shapeSvg: "/shapes/opposite.svg", pattern: "/patterns/opposite.svg" },
    motion: {
      enter: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 75, damping: 16 },
      swipeRightEffect: "flip",
    },
    haptics: { pattern: [18] },
    sound: { src: "/sounds/whoosh.mp3", volume: 0.25 },
  },

  playful: {
    id: "playful",
    label: "Playful-Satirical",
    icon: "🎈",
    prompt:
      "Rewrite the user’s text with light satire or absurd humor.\n" +
      "Constraints:\n" +
      "- 1–2 sentences. No emojis, no hashtags.\n" +
      "- Keep meaning recognizable; exaggerate slightly for comic effect.\n" +
      "- Include one playful metaphor or absurd comparison.\n" +
      "- Fun, not mean: no mocking individuals or protected groups.",
    colors: { bg: "#D9B3FF", accent: "#FF69B4", text: "#2D0030", patternOpacity: 0.08 },
    assets: { shapeSvg: "/shapes/playful.svg", pattern: "/patterns/playful.svg" },
    motion: {
      enter: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 60, damping: 12 },
      swipeRightEffect: "confetti",
    },
    haptics: { pattern: [6, 40, 6, 40, 6] },
    sound: { src: "/sounds/pop.mp3", volume: 0.22 },
  },
} as const;

export const TIMELINE_LIST: ReadonlyArray<TimelineSpec> = Object.values(
  TIMELINES
) as unknown as TimelineSpec[];

export function getTimeline(id: TimelineId): TimelineSpec {
  return TIMELINES[id];
}
