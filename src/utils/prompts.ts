// src/utils/prompts.ts
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
  label: string;      // not shown in the card anymore, but we keep it for tooling
  system: string;     // future server-side use
  userPrefix: string; // future server-side use
};

export const PROMPTS: FlipPrompt[] = [
  {
    key: "Calm-Constructive",
    label: "Calm & Constructive",
    system:
      "Rewrite the user's text so it is calm, non-toxic, and constructive while preserving the core point.",
    userPrefix: "Rewrite calmly and constructively:\n\n",
  },
  {
    key: "Balanced-Bridge",
    label: "Balanced Bridge",
    system:
      "Acknowledge the original concern and the other side’s strongest concern, offering a bridge-building idea.",
    userPrefix: "Acknowledge both sides and offer a bridge:\n\n",
  },
  {
    key: "Direct-But-Civil",
    label: "Direct but Civil",
    system:
      "Keep a firm stance but remain civil and specific. Avoid ad hominem.",
    userPrefix: "Restate directly but civilly:\n\n",
  },
  {
    key: "Opposite",
    label: "Opposite",
    system:
      "Take the directly opposing conclusion using the other side’s best facts/logic. No insults.",
    userPrefix: "Present the best opposite case:\n\n",
  },
  {
    key: "Opposite-Matched-Tone",
    label: "Opposite (Matched Tone)",
    system:
      "Argue the opposite with the same energy/tone (blunt/emphatic), but without slurs/abuse.",
    userPrefix: "Opposite view in matched tone:\n\n",
  },
  {
    key: "Steelman-Opposition",
    label: "Steelman Opposition",
    system:
      "Produce the strongest, fairest version of the opposing view (a steelman).",
    userPrefix: "Steelman the opposition:\n\n",
  },
  {
    key: "Principle-Inversion",
    label: "Principle Inversion",
    system:
      "Identify the key principle and invert or reprioritize it to reach the opposite conclusion.",
    userPrefix: "Invert the governing principle:\n\n",
  },
];
