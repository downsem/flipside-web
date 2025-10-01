// src/utils/prompts.ts

// These keys MUST match your backend prompt IDs exactly.
export type PromptKey =
  | "Calm-Constructive"
  | "Balanced-Bridge"
  | "Direct-But-Civil"
  | "Opposite"
  | "Opposite-Matched-Tone"
  | "Steelman-Opposition"
  | "Principle-Inversion";

export type FlipPrompt = {
  key: PromptKey;
  label: string;       // shown in UI
  // kept for forward-compat; backend currently ignores these
  system: string;
  userPrefix: string;
};

export const PROMPTS: FlipPrompt[] = [
  {
    key: "Calm-Constructive",
    label: "Calm & Constructive",
    system:
      "Rewrite the user's text so it is calm, non-toxic, and constructive. Preserve the core point, remove hostility and slurs, keep it concise.",
    userPrefix: "Rewrite this to be calm, non-toxic, and constructive:\n\n",
  },
  {
    key: "Balanced-Bridge",
    label: "Balanced Bridge",
    system:
      "Rewrite to acknowledge the original concern AND the other side’s strongest concerns. Aim for a bridge-building tone that suggests a pragmatic compromise.",
    userPrefix:
      "Acknowledge their core concern and the other side's best concern; propose a pragmatic bridge:\n\n",
  },
  {
    key: "Direct-But-Civil",
    label: "Direct but Civil",
    system:
      "Rewrite to keep a firm stance, but stay civil and avoid ad hominem. Be clear, specific, and respectful.",
    userPrefix: "Keep the stance firm but civil and specific:\n\n",
  },
  {
    key: "Opposite",
    label: "Opposite",
    system:
      "Write a concise argument that takes the directly opposing conclusion to the user's text. Do not straw-man; use the opponent’s best facts/logic. No insults.",
    userPrefix: "Argue the opposite position fairly and succinctly:\n\n",
  },
  {
    key: "Opposite-Matched-Tone",
    label: "Opposite (Matched Tone)",
    system:
      "Write a concise opposite-position response that MATCHES the user's intensity and voice style (e.g., blunt, emphatic) BUT avoids slurs and direct personal insults. Keep it punchy.",
    userPrefix:
      "Argue the opposite position in the same tone/energy (no slurs/insults):\n\n",
  },
  {
    key: "Steelman-Opposition",
    label: "Steelman (Opposition)",
    system:
      "Produce the strongest, fairest version of the opposing view (a steelman). Use the most compelling reasons/values the other side would cite, succinctly.",
    userPrefix:
      "Steelman the opposing view with its strongest reasons/values:\n\n",
  },
  {
    key: "Principle-Inversion",
    label: "Principle Inversion",
    system:
      "Identify the key principle the user relies on. Now invert or reprioritize that principle to reach the opposite conclusion. Keep it clear and reasoned, not hostile.",
    userPrefix:
      "Identify the core principle, then invert/reprioritize it to reach the opposite conclusion:\n\n",
  },
];
