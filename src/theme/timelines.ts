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
      "Rewrite the user’s text so it is calm, non-toxic, and constructive. Preserve the core point, remove hostility and slurs, keep it concise.",
    colors: { bg: "#B7E2F6", accent: "#F5F9FB", text: "#1E2A32", patternOpacity: 0.06 },
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
      "Rewrite to acknowledge the original concern AND the other side’s strongest concerns. Aim for a bridge-building tone that suggests a pragmatic compromise.",
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
      "Rewrite the user’s text with dry humor and sharp skepticism. Keep it concise, clever, and grounded in truth—never cruel, but knowingly ironic.",
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
      "Write a concise argument that takes the directly opposing conclusion to the user’s text. Don’t straw-man—use the opponent’s best facts and reasoning. No insults.",
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
      "Rewrite the user’s text with light satire or absurd humor. Keep the meaning recognizable but exaggerate slightly for comic effect. Fun, not mean.",
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
