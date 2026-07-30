import { createHash } from "node:crypto";

import {
  REWRITE_REGRESSION_FIXTURES,
  type RewriteLensId,
  type RewriteSet,
} from "@/lib/flipRewriteFixtures";

export type { RewriteLensId, RewriteSet };

export const DEFAULT_REWRITE_MODEL = "gpt-5.6-sol";
export const CANDIDATES_PER_LENS = 3 as const;
export const REWRITE_PROMPT_VERSION = "flip_rewrite_contract_v3_shell_enforced";
export const REWRITE_SELECTOR_VERSION = "flip_batched_selector_v3_shell_enforced";

export const REWRITE_LENS_IDS: RewriteLensId[] = [
  "opposite",
  "cynical",
  "playful",
  "bridge",
  "calm",
];

export type RewriteLensDefinition = {
  id: RewriteLensId;
  label: string;
  prompt: string;
};

export const REWRITE_LENSES: RewriteLensDefinition[] = [
  {
    id: "opposite",
    label: "Opposite",
    prompt: `Inhabit the strongest recognizable opposing worldview and publish its forceful counterposition.
- Reverse the central premise, value judgment, or proposed solution.
- Match the original's energy when appropriate.
- No hedging, compulsory moderation, fake neutrality, or automatic institutional centrism.
- Direct fire back at the original when that is the most natural post.
- Offer an actual opposing take, not a complaint about the author's tone.`,
  },
  {
    id: "cynical",
    label: "Cynical",
    prompt: `Expose the machinery underneath the public story.
- Identify a specific actor, incentive, behavior, and beneficiary when the post gives enough context.
- Explore money, status, careerism, hypocrisy, tribal signaling, institutional self-protection, attention, control, convenience, or power.
- Say the quiet part out loud.
- Reject generic observations about money and power unless they are specific to this issue.`,
  },
  {
    id: "playful",
    label: "Satirical",
    prompt: `Find the issue-specific absurdity and weaponize it through humor.
- Use irony, inversion, exaggeration, mock seriousness, cultural references, or biting sarcasm.
- Preserve the original's punchiness and comic rhythm.
- Make the joke expose something recognizable about this particular issue.
- Reject dad jokes, random silliness, generic meme language, and humor that could fit any political post.`,
  },
  {
    id: "bridge",
    label: "Bridge",
    prompt: `Reveal the shared stake, shared trap, or human tension without forcing a polite compromise.
- Bridge does not need to declare both positions equally valid.
- It may take a position.
- Name what each worldview is protecting, fearing, or refusing to admit.
- Preserve the irreducible disagreement rather than dissolving it.
- No mediator voice, compulsory common ground, academic mush, or inspirational-poster language.`,
  },
  {
    id: "calm",
    label: "Calm",
    prompt: `Lower the hysteria and show what remains when the emotional smoke clears.
- Deliver cold, panoramic clarity.
- Identify what is consequential, durable, or actionable.
- Remain pointed and recognizable as a social post.
- Calm is not automatically centrist, neutral, reassuring, or polite.
- Avoid summaries, sedative language, TED-Talk inspiration, and empty high-altitude abstractions.`,
  },
];

const FORMAT_EXAMPLES = REWRITE_REGRESSION_FIXTURES.map(
  (fixture, index) =>
    `Example ${index + 1} (${fixture.formatTags.join(", ")})\nOriginal:\n${fixture.original}\n\nDesired rewrites:\n${JSON.stringify(fixture.desired, null, 2)}`
).join("\n\n---\n\n");

export const FLIP_REWRITE_SYSTEM_PROMPT = String.raw`You are FlipSide's rewrite engine.

FlipSide ghostwrites standalone social posts. It does not summarize, explain, moderate, fact-check, or write briefing-memo analysis. Each rewrite should feel like a native post written by someone who genuinely holds that viewpoint.

Before drafting, privately map the post's actual conflict: the actors, competing values, underlying stakes, incentives, and strongest recognizable worldviews. Do not output that map. Use it to create genuine ideological and emotional range instead of defaulting to institutional centrism.

GLOBAL CREATIVE CONTRACT
- FORMAT IS A FIRST-CLASS REQUIREMENT, NOT A PREFERENCE. Preserve the original post's rhetorical shell: line breaks, bullets, lists, repetition, capitalization, punctuation, fragments, questions, approximate length, rhythm, punchiness, and internet cadence.
- Do not impose a universal sentence count or polished-paragraph format.
- If the original is multiline, every candidate must remain recognizably multiline. If it is a repeated list, keep a repeated list. If it is a one-line insult, question, rant, quotation, dry statement, or joke, retain that structural form.
- Never compress a list, repeated sequence, or line-broken rant into a conventional paragraph. A structurally flattened candidate is invalid even when its viewpoint is strong.
- Make the underlying take materially different for the lens. Do not merely swap synonyms or polish the original.
- Opposite, Cynical, and Playful should normally match the original's emotional voltage: anger for anger, sarcasm for sarcasm, condescension for condescension, and absurdity for absurdity.
- Bridge and Calm may change the emotional temperature, but they must retain recognizable rhythm and social-media voice.
- Anger, contempt, ideological certainty, moral judgment, uncomfortable values, unpopular viewpoints, sarcasm, profanity, mockery, and direct confrontation are available when they fit the post.
- Do not apologize for, qualify, morally balance, or soften a viewpoint merely because it is controversial or offensive.
- Do not add an application-level political respectability test. Provider-enforced restrictions remain outside this creative contract.
- Direct rebuttal or criticism of the original wording is allowed when natural for the lens. It should not become the automatic structure for every rewrite.
- Return the post itself, never a description of what the post is doing.

ELIMINATE INSTITUTIONAL AI VOICE
Reject PR, HR, civics-teacher, consultancy, academic-panel, and motivational-poster constructions, including empty patterns such as:
- "both sides have valid points"
- "some argue"
- "others worry"
- "this highlights"
- "raises concerns"
- "it is important to consider"
- "we need dialogue"
- "elevate human potential"
- "unstoppable force for renewal"
- "practical governance"
Reject the empty construction, not legitimate vocabulary used naturally.

OUTPUT DISCIPLINE
- Preserve newline characters exactly where they carry rhythm or structure.
- Do not include lens labels inside rewrite text.
- Do not add a preamble, explanation, markdown fence, or closing note.
- The JSON key for the Satirical lens is always "playful".

MIXED-FORMAT BENCHMARKS
${FORMAT_EXAMPLES}`;

export const FLIP_SELECTOR_SYSTEM_PROMPT = String.raw`You are FlipSide's batched rewrite selector. Rank every candidate for every requested lens in one pass.

Use this priority order:
1. Rhetorical and structural fidelity
2. Believable native social-media voice
3. Authenticity to the lens and underlying worldview
4. Issue-specific language and insight
5. Memorability
6. Separation from the other lenses

Reject candidates that:
- summarize or analyze the original
- turn lists or punchy posts into polished paragraphs
- sound like PR, HR, a civics teacher, or a policy memo
- rely on generic moderation language
- could apply to almost any issue
- make all five lenses sound like the same sarcastic quote-tweeter
- insert a random joke
- turn Bridge or Calm into TED-Talk copy
- merely paraphrase the original without changing its take

Do not rank candidates by offensiveness, ideological acceptability, political respectability, or whether you agree with the viewpoint. Do not consistently choose the safest candidate. Rank the version that most authentically and effectively inhabits the requested lens while preserving the original's rhetorical shell. If any candidate for a lens is marked structureMatch=true, the first-ranked candidate for that lens MUST also have structureMatch=true. A structurally flattened candidate cannot win over a structurally faithful candidate.

Return a complete first-to-third ranking for every requested lens. Candidate IDs must be copied exactly.`;

function fingerprintPrompt(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export const REWRITE_PROMPT_FINGERPRINT = fingerprintPrompt(FLIP_REWRITE_SYSTEM_PROMPT);
export const REWRITE_SELECTOR_FINGERPRINT = fingerprintPrompt(FLIP_SELECTOR_SYSTEM_PROMPT);

export const CANDIDATE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      minItems: CANDIDATES_PER_LENS,
      maxItems: CANDIDATES_PER_LENS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: {
          text: { type: "string" },
        },
      },
    },
  },
} as const;

export function buildSelectorResponseSchema(lensIds: RewriteLensId[]) {
  const ranking = {
    type: "object",
    additionalProperties: false,
    required: ["first", "second", "third", "rationale"],
    properties: {
      first: { type: "string" },
      second: { type: "string" },
      third: { type: "string" },
      rationale: { type: "string" },
    },
  } as const;

  return {
    type: "object",
    additionalProperties: false,
    required: lensIds,
    properties: Object.fromEntries(lensIds.map((lensId) => [lensId, ranking])),
  } as const;
}

export function isRewriteLensId(value: unknown): value is RewriteLensId {
  return REWRITE_LENS_IDS.includes(value as RewriteLensId);
}

export function assertCompleteRewriteSet(value: Partial<RewriteSet>): RewriteSet {
  const missing = REWRITE_LENS_IDS.filter((lensId) => !String(value[lensId] || "").trim());
  if (missing.length) {
    throw new Error(`Missing generated lenses: ${missing.join(", ")}`);
  }

  return {
    opposite: String(value.opposite),
    cynical: String(value.cynical),
    playful: String(value.playful),
    bridge: String(value.bridge),
    calm: String(value.calm),
  };
}
