// src/theme/timelines.ts

export type TimelineId = "calm" | "bridge" | "cynical" | "opposite" | "playful";

export type TimelineSpec = {
  id: TimelineId;
  label: string;
  icon: string;
};

export const TIMELINE_LIST: TimelineSpec[] = [
  { id: "calm", label: "Calm", icon: "◦" },
  { id: "bridge", label: "Bridge", icon: "↔" },
  { id: "cynical", label: "Cynical", icon: "⌁" },
  { id: "opposite", label: "Opposite", icon: "⇄" },
  { id: "playful", label: "Playful", icon: "✦" },
];

export const TIMELINES = TIMELINE_LIST;
export const LENS_ORDER = TIMELINE_LIST.map((timeline) => timeline.id);

export const TIMELINE_BY_ID = TIMELINE_LIST.reduce((acc, timeline) => {
  acc[timeline.id] = timeline;
  return acc;
}, {} as Record<TimelineId, TimelineSpec>);

export const ID_TO_LENS = TIMELINE_BY_ID;
