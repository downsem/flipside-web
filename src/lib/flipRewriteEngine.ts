import OpenAI from "openai";
import {
  CANDIDATE_RESPONSE_SCHEMA,
  CANDIDATES_PER_LENS,
  DEFAULT_REWRITE_MODEL,
  FLIP_REWRITE_SYSTEM_PROMPT,
  FLIP_SELECTOR_SYSTEM_PROMPT,
  REWRITE_LENSES,
  REWRITE_LENS_IDS,
  REWRITE_PROMPT_FINGERPRINT,
  REWRITE_PROMPT_VERSION,
  REWRITE_SELECTOR_FINGERPRINT,
  REWRITE_SELECTOR_VERSION,
  buildSelectorResponseSchema,
  type RewriteLensDefinition,
  type RewriteLensId,
  type RewriteSet,
} from "@/lib/flipRewriteContract";

export type RewriteCandidate = {
  id: string;
  lensId: RewriteLensId;
  text: string;
  rank: number;
  score: number;
  reason: string;
  selected: boolean;
  rejected: boolean;
  structureMatch: boolean;
  structureScore: number;
  structureIssues: string[];
  observedModel: string;
  systemFingerprint: string | null;
};

export type RewriteUsage = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  calls: number;
};

export type RewriteModelCall = {
  phase: "candidate_generation" | "candidate_regeneration" | "selector";
  lensId: RewriteLensId | null;
  requestedModel: string;
  observedModel: string;
  systemFingerprint: string | null;
  requestId: string | null;
};

export type RewriteEngineResult = {
  model: string;
  observedModels: string[];
  modelCalls: RewriteModelCall[];
  promptVersion: string;
  promptFingerprint: string;
  selectorVersion: string;
  selectorFingerprint: string;
  rewrites: Partial<RewriteSet>;
  candidatesByLens: Partial<Record<RewriteLensId, RewriteCandidate[]>>;
  errorsByLens: Partial<Record<RewriteLensId, string>>;
  usage: RewriteUsage;
  latencyMs: number;
};

type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

type CandidatePayload = {
  candidates?: Array<{ text?: unknown }>;
};

type SelectorRanking = {
  first?: unknown;
  second?: unknown;
  third?: unknown;
  rationale?: unknown;
};

type SelectorPayload = Partial<Record<RewriteLensId, SelectorRanking>>;

type RhetoricalShell = {
  nonEmptyLineCount: number;
  blankLineSeparated: boolean;
  listLineCount: number;
  listMarker: "dash" | "bullet" | "numbered" | null;
  repeatedOpening: boolean;
  singleLine: boolean;
  endsWithQuestion: boolean;
  mostlyUppercase: boolean;
};

type StructureAssessment = {
  match: boolean;
  score: number;
  issues: string[];
};

const EMPTY_USAGE: RewriteUsage = {
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  calls: 0,
};

const INSTITUTIONAL_PATTERNS = [
  /both sides have valid points/i,
  /\bsome argue\b/i,
  /\bothers worry\b/i,
  /\bthis highlights\b/i,
  /\braises concerns\b/i,
  /\bit is important to consider\b/i,
  /\bwe need dialogue\b/i,
  /\bpractical governance\b/i,
  /\belevate human potential\b/i,
  /\bunstoppable force for renewal\b/i,
];

const LIST_LINE_PATTERN = /^\s*((?:[-*•])|(?:\d+[.)]))\s*/;

function parseReasoningEffort(value: unknown, fallback: ReasoningEffort): ReasoningEffort {
  const normalized = String(value || "").toLowerCase() as ReasoningEffort;
  return ["none", "low", "medium", "high", "xhigh", "max"].includes(normalized)
    ? normalized
    : fallback;
}

export function getGenerationReasoningEffort(): ReasoningEffort {
  return parseReasoningEffort(process.env.OPENAI_FLIP_GENERATION_REASONING_EFFORT, "medium");
}

export function getSelectorReasoningEffort(): ReasoningEffort {
  return parseReasoningEffort(process.env.OPENAI_FLIP_SELECTOR_REASONING_EFFORT, "medium");
}

function normalizeNewlines(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function cleanRewriteText(value: unknown, max = 6000): string {
  return normalizeNewlines(String(value || ""))
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
    .slice(0, max);
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("The model returned an empty structured response.");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The model returned an invalid structured response.");
  }
  return parsed as Record<string, unknown>;
}

function usageFromCompletion(completion: any): RewriteUsage {
  const usage = completion?.usage || {};
  const inputTokens = Number(usage.prompt_tokens || usage.input_tokens || 0);
  const outputTokens = Number(usage.completion_tokens || usage.output_tokens || 0);
  const reasoningTokens = Number(
    usage.completion_tokens_details?.reasoning_tokens ||
      usage.output_tokens_details?.reasoning_tokens ||
      0
  );
  return {
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: Number(usage.total_tokens || inputTokens + outputTokens),
    calls: 1,
  };
}

function addUsage(left: RewriteUsage, right: RewriteUsage): RewriteUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    reasoningTokens: left.reasoningTokens + right.reasoningTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    calls: left.calls + right.calls,
  };
}

function modelCallFromCompletion(
  completion: any,
  params: {
    phase: RewriteModelCall["phase"];
    lensId: RewriteLensId | null;
    requestedModel: string;
  }
): RewriteModelCall {
  return {
    phase: params.phase,
    lensId: params.lensId,
    requestedModel: params.requestedModel,
    observedModel: String(completion?.model || params.requestedModel),
    systemFingerprint: completion?.system_fingerprint
      ? String(completion.system_fingerprint)
      : null,
    requestId: completion?._request_id ? String(completion._request_id) : null,
  };
}

function lensDefinition(lensId: RewriteLensId): RewriteLensDefinition {
  const definition = REWRITE_LENSES.find((lens) => lens.id === lensId);
  if (!definition) throw new Error(`Unknown rewrite lens: ${lensId}`);
  return definition;
}

function uppercaseRatio(value: string) {
  const letters = value.match(/[A-Za-z]/g) || [];
  if (!letters.length) return 0;
  return letters.filter((letter) => letter === letter.toUpperCase()).length / letters.length;
}

function firstMeaningfulWord(line: string): string {
  return line
    .replace(LIST_LINE_PATTERN, "")
    .trim()
    .toLowerCase()
    .match(/[a-z0-9']+/)?.[0] || "";
}

export function analyzeRhetoricalShell(value: string): RhetoricalShell {
  const normalized = normalizeNewlines(value);
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const listMarkers = lines
    .map((line) => line.match(LIST_LINE_PATTERN)?.[1] || null)
    .filter((marker): marker is string => Boolean(marker));
  const openingCounts = new Map<string, number>();
  for (const line of lines) {
    const opening = firstMeaningfulWord(line);
    if (opening) openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
  }
  const largestOpeningGroup = Math.max(0, ...openingCounts.values());
  const dominantMarker = listMarkers[0] || null;
  const listMarker = dominantMarker
    ? /^\d/.test(dominantMarker)
      ? "numbered"
      : dominantMarker === "•"
        ? "bullet"
        : "dash"
    : null;

  return {
    nonEmptyLineCount: lines.length,
    blankLineSeparated: /\n\s*\n/.test(normalized),
    listLineCount: listMarkers.length,
    listMarker,
    repeatedOpening:
      lines.length >= 3 && largestOpeningGroup >= Math.max(2, Math.ceil(lines.length * 0.5)),
    singleLine: lines.length <= 1,
    endsWithQuestion: /\?\s*$/.test(normalized),
    mostlyUppercase: uppercaseRatio(normalized) >= 0.72,
  };
}

function shellRequiresHardMatch(shell: RhetoricalShell): boolean {
  return (
    shell.nonEmptyLineCount >= 3 ||
    shell.listLineCount >= 2 ||
    shell.endsWithQuestion ||
    shell.mostlyUppercase
  );
}

function shellRequirements(shell: RhetoricalShell): string[] {
  const requirements: string[] = [];
  if (shell.nonEmptyLineCount >= 3) {
    const minimum = Math.max(2, Math.floor(shell.nonEmptyLineCount * 0.6));
    const maximum = Math.ceil(shell.nonEmptyLineCount * 1.5) + 1;
    requirements.push(
      `Keep the rewrite multiline, with roughly ${minimum}-${maximum} non-empty lines (the original has ${shell.nonEmptyLineCount}).`
    );
  } else if (shell.singleLine) {
    requirements.push("Keep the rewrite to one punchy line unless a second line is essential to the same rhetorical beat.");
  }
  if (shell.listLineCount >= 2) {
    requirements.push(
      `Keep a recognizable ${shell.listMarker || "list"} list with at least ${Math.max(2, Math.floor(shell.listLineCount * 0.6))} list lines. Do not turn it into a paragraph.`
    );
  }
  if (shell.blankLineSeparated) {
    requirements.push("Retain the original's visible line spacing rather than packing the lines together.");
  }
  if (shell.repeatedOpening) {
    requirements.push("Retain a repeated opening or parallel line pattern that echoes the original cadence.");
  }
  if (shell.endsWithQuestion) {
    requirements.push("Keep the rewrite in question form and end with a question mark.");
  }
  if (shell.mostlyUppercase) {
    requirements.push("Keep the emphatic mostly-uppercase presentation.");
  }
  return requirements;
}

export function assessStructuralFidelity(
  originalShell: RhetoricalShell,
  candidateText: string
): StructureAssessment {
  const candidateShell = analyzeRhetoricalShell(candidateText);
  const issues: string[] = [];
  let score = 100;

  if (originalShell.nonEmptyLineCount >= 3) {
    const minimum = Math.max(2, Math.floor(originalShell.nonEmptyLineCount * 0.6));
    const maximum = Math.ceil(originalShell.nonEmptyLineCount * 1.5) + 1;
    if (candidateShell.nonEmptyLineCount < minimum) {
      issues.push("collapsed a multiline original into too few lines");
      score -= 55;
    } else if (candidateShell.nonEmptyLineCount > maximum) {
      issues.push("expanded far beyond the original line structure");
      score -= 15;
    }
  }

  if (originalShell.listLineCount >= 2) {
    const minimumListLines = Math.max(2, Math.floor(originalShell.listLineCount * 0.6));
    if (candidateShell.listLineCount < minimumListLines) {
      issues.push("lost the original list structure");
      score -= 50;
    }
  }

  if (originalShell.blankLineSeparated && !candidateShell.blankLineSeparated) {
    issues.push("lost the original line spacing");
    score -= 8;
  }
  if (originalShell.repeatedOpening && !candidateShell.repeatedOpening) {
    issues.push("lost the original repeated cadence");
    score -= 12;
  }
  if (originalShell.singleLine && candidateShell.nonEmptyLineCount > 2) {
    issues.push("expanded a one-line post into a multi-line explanation");
    score -= 35;
  }
  if (originalShell.endsWithQuestion && !candidateShell.endsWithQuestion) {
    issues.push("changed a question into a statement");
    score -= 35;
  }
  if (originalShell.mostlyUppercase && !candidateShell.mostlyUppercase) {
    issues.push("lost the original emphatic capitalization");
    score -= 35;
  }

  const hardIssues = issues.filter((issue) =>
    /collapsed|lost the original list|one-line|question|capitalization/.test(issue)
  );
  return {
    match: hardIssues.length === 0,
    score: Math.max(1, Math.min(100, score)),
    issues,
  };
}

function buildCandidatePrompt(
  originalText: string,
  lens: RewriteLensDefinition,
  shell: RhetoricalShell,
  repair = false
): string {
  const requirements = shellRequirements(shell);
  return [
    `CURRENT LENS: ${lens.label}`,
    lens.prompt,
    "",
    `Generate exactly ${CANDIDATES_PER_LENS} genuinely different candidates for this lens.`,
    "Each candidate must preserve the original post's recognizable rhetorical form while expressing a materially different take.",
    repair
      ? "FORMAT REPAIR: the previous candidate set flattened the original structure. This attempt must satisfy every structural requirement below."
      : "FORMAT CONTRACT: these structural requirements are mandatory, not optional preferences.",
    ...requirements.map((requirement) => `- ${requirement}`),
    "- A candidate that collapses a list, repeated sequence, question, emphatic one-liner, or line-broken rant into a polished paragraph is invalid.",
    "Do not label the candidates inside their text.",
    "",
    "ORIGINAL POST:",
    originalText,
  ].join("\n");
}

async function requestCandidateBatch(
  openai: OpenAI,
  params: {
    originalText: string;
    lens: RewriteLensDefinition;
    lensId: RewriteLensId;
    model: string;
    shell: RhetoricalShell;
    repair: boolean;
  }
): Promise<{
  candidates: RewriteCandidate[];
  usage: RewriteUsage;
  modelCall: RewriteModelCall;
}> {
  const completion = await openai.chat.completions.create({
    model: params.model,
    reasoning_effort: getGenerationReasoningEffort() as any,
    max_completion_tokens: 2400,
    store: false,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: `flipside_${params.lensId}_candidates`,
        strict: true,
        schema: CANDIDATE_RESPONSE_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: FLIP_REWRITE_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCandidatePrompt(params.originalText, params.lens, params.shell, params.repair),
      },
    ],
  });

  const payload = parseJsonObject(completion.choices[0]?.message?.content) as CandidatePayload;
  const rawCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  if (rawCandidates.length !== CANDIDATES_PER_LENS) {
    throw new Error(
      `${params.lens.label} returned ${rawCandidates.length} candidates; expected ${CANDIDATES_PER_LENS}.`
    );
  }

  const observedModel = String(completion.model || params.model);
  const systemFingerprint = completion.system_fingerprint
    ? String(completion.system_fingerprint)
    : null;
  const candidates = rawCandidates.map((candidate, index) => {
    const text = cleanRewriteText(candidate?.text);
    if (!text) throw new Error(`${params.lens.label} candidate ${index + 1} was empty.`);
    const structure = assessStructuralFidelity(params.shell, text);
    return {
      id: `${params.lensId}_${index + 1}`,
      lensId: params.lensId,
      text,
      rank: 0,
      score: 0,
      reason: "Awaiting batched selection",
      selected: false,
      rejected: false,
      structureMatch: structure.match,
      structureScore: structure.score,
      structureIssues: structure.issues,
      observedModel,
      systemFingerprint,
    };
  });

  return {
    candidates,
    usage: usageFromCompletion(completion),
    modelCall: modelCallFromCompletion(completion, {
      phase: params.repair ? "candidate_regeneration" : "candidate_generation",
      lensId: params.lensId,
      requestedModel: params.model,
    }),
  };
}

async function generateCandidatesForLens(
  openai: OpenAI,
  params: { originalText: string; lensId: RewriteLensId; model: string }
): Promise<{
  candidates: RewriteCandidate[];
  usage: RewriteUsage;
  modelCalls: RewriteModelCall[];
}> {
  const lens = lensDefinition(params.lensId);
  const shell = analyzeRhetoricalShell(params.originalText);
  const first = await requestCandidateBatch(openai, {
    ...params,
    lens,
    shell,
    repair: false,
  });

  if (shellRequiresHardMatch(shell) && !first.candidates.some((candidate) => candidate.structureMatch)) {
    const repaired = await requestCandidateBatch(openai, {
      ...params,
      lens,
      shell,
      repair: true,
    });
    return {
      candidates: repaired.candidates,
      usage: addUsage(first.usage, repaired.usage),
      modelCalls: [first.modelCall, repaired.modelCall],
    };
  }

  return {
    candidates: first.candidates,
    usage: first.usage,
    modelCalls: [first.modelCall],
  };
}

function heuristicCandidateScore(originalText: string, candidate: RewriteCandidate): number {
  let score = candidate.structureScore;
  const lengthRatio = candidate.text.length / Math.max(1, originalText.length);
  if (lengthRatio >= 0.55 && lengthRatio <= 1.8) score += 8;
  else score -= 8;

  if (INSTITUTIONAL_PATTERNS.some((pattern) => pattern.test(candidate.text))) score -= 30;
  if (/\b(the real issue|this is really about|at the end of the day)\b/i.test(candidate.text)) score -= 12;
  if (/[!?—:“”'…]/.test(candidate.text)) score += 3;

  return Math.max(1, Math.min(100, score));
}

function fallbackRanking(
  originalText: string,
  candidatesByLens: Partial<Record<RewriteLensId, RewriteCandidate[]>>
): Partial<Record<RewriteLensId, { ids: string[]; rationale: string }>> {
  const rankings: Partial<Record<RewriteLensId, { ids: string[]; rationale: string }>> = {};
  for (const lensId of REWRITE_LENS_IDS) {
    const candidates = candidatesByLens[lensId];
    if (!candidates?.length) continue;
    rankings[lensId] = {
      ids: [...candidates]
        .sort(
          (a, b) =>
            Number(b.structureMatch) - Number(a.structureMatch) ||
            heuristicCandidateScore(originalText, b) - heuristicCandidateScore(originalText, a)
        )
        .map((candidate) => candidate.id),
      rationale: "Structural-shell fallback ranking",
    };
  }
  return rankings;
}

function validateRankingIds(
  lensId: RewriteLensId,
  ranking: SelectorRanking | undefined,
  candidates: RewriteCandidate[]
) {
  const ids = [ranking?.first, ranking?.second, ranking?.third].map((value) => String(value || ""));
  const validIds = new Set(candidates.map((candidate) => candidate.id));
  if (ids.length !== CANDIDATES_PER_LENS || new Set(ids).size !== CANDIDATES_PER_LENS) {
    throw new Error(`${lensId} selector ranking was incomplete.`);
  }
  if (ids.some((id) => !validIds.has(id))) {
    throw new Error(`${lensId} selector returned an unknown candidate ID.`);
  }

  const first = candidates.find((candidate) => candidate.id === ids[0]);
  if (candidates.some((candidate) => candidate.structureMatch) && !first?.structureMatch) {
    throw new Error(`${lensId} selector chose a structurally flattened candidate over a matching one.`);
  }
  return ids;
}

async function rankAllCandidates(
  openai: OpenAI,
  params: {
    originalText: string;
    model: string;
    candidatesByLens: Partial<Record<RewriteLensId, RewriteCandidate[]>>;
  }
): Promise<{
  rankings: Partial<Record<RewriteLensId, { ids: string[]; rationale: string }>>;
  usage: RewriteUsage;
  modelCalls: RewriteModelCall[];
}> {
  const lensIds = REWRITE_LENS_IDS.filter((lensId) => params.candidatesByLens[lensId]?.length);
  if (!lensIds.length) return { rankings: {}, usage: EMPTY_USAGE, modelCalls: [] };

  let completion: any = null;
  try {
    completion = await openai.chat.completions.create({
      model: params.model,
      reasoning_effort: getSelectorReasoningEffort() as any,
      max_completion_tokens: 2200,
      store: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flipside_batched_candidate_ranking",
          strict: true,
          schema: buildSelectorResponseSchema(lensIds),
        },
      },
      messages: [
        { role: "system", content: FLIP_SELECTOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              originalPost: params.originalText,
              originalShell: analyzeRhetoricalShell(params.originalText),
              lenses: lensIds.map((lensId) => ({
                lensId,
                lensInstructions: lensDefinition(lensId).prompt,
                candidates: params.candidatesByLens[lensId]?.map(
                  ({ id, text, structureMatch, structureScore, structureIssues }) => ({
                    id,
                    text,
                    structureMatch,
                    structureScore,
                    structureIssues,
                  })
                ),
              })),
            },
            null,
            2
          ),
        },
      ],
    });

    const payload = parseJsonObject(completion.choices[0]?.message?.content) as SelectorPayload;
    const rankings: Partial<Record<RewriteLensId, { ids: string[]; rationale: string }>> = {};
    for (const lensId of lensIds) {
      const candidates = params.candidatesByLens[lensId] || [];
      rankings[lensId] = {
        ids: validateRankingIds(lensId, payload[lensId], candidates),
        rationale: cleanRewriteText(payload[lensId]?.rationale, 500) || "Batched model ranking",
      };
    }
    return {
      rankings,
      usage: usageFromCompletion(completion),
      modelCalls: [
        modelCallFromCompletion(completion, {
          phase: "selector",
          lensId: null,
          requestedModel: params.model,
        }),
      ],
    };
  } catch (error) {
    console.warn("[flipRewriteEngine] Batched selector failed; using structural fallback.", error);
    return {
      rankings: fallbackRanking(params.originalText, params.candidatesByLens),
      usage: completion ? usageFromCompletion(completion) : EMPTY_USAGE,
      modelCalls: completion
        ? [
            modelCallFromCompletion(completion, {
              phase: "selector",
              lensId: null,
              requestedModel: params.model,
            }),
          ]
        : [],
    };
  }
}

export async function generateFlipRewrites(
  openai: OpenAI,
  params: {
    originalText: string;
    lensIds?: RewriteLensId[];
    model?: string;
    allowPartial?: boolean;
  }
): Promise<RewriteEngineResult> {
  const startedAt = Date.now();
  const originalText = cleanRewriteText(params.originalText, 12000);
  if (!originalText) throw new Error("An original post is required.");

  const lensIds = params.lensIds?.length ? params.lensIds : REWRITE_LENS_IDS;
  const model = params.model || DEFAULT_REWRITE_MODEL;
  let usage = { ...EMPTY_USAGE };
  const modelCalls: RewriteModelCall[] = [];
  const candidatesByLens: Partial<Record<RewriteLensId, RewriteCandidate[]>> = {};
  const errorsByLens: Partial<Record<RewriteLensId, string>> = {};

  const generated = await Promise.allSettled(
    lensIds.map(async (lensId) => ({
      lensId,
      result: await generateCandidatesForLens(openai, { originalText, lensId, model }),
    }))
  );

  generated.forEach((result, index) => {
    const lensId = lensIds[index];
    if (result.status === "fulfilled") {
      candidatesByLens[lensId] = result.value.result.candidates;
      usage = addUsage(usage, result.value.result.usage);
      modelCalls.push(...result.value.result.modelCalls);
    } else {
      errorsByLens[lensId] = String(
        result.reason?.message || result.reason || "Candidate generation failed"
      );
    }
  });

  if (!params.allowPartial && Object.keys(errorsByLens).length) {
    throw new Error(`Candidate generation failed for: ${Object.keys(errorsByLens).join(", ")}`);
  }

  const selection = await rankAllCandidates(openai, { originalText, model, candidatesByLens });
  usage = addUsage(usage, selection.usage);
  modelCalls.push(...selection.modelCalls);

  const rewrites: Partial<RewriteSet> = {};
  for (const lensId of lensIds) {
    const candidates = candidatesByLens[lensId];
    const ranking = selection.rankings[lensId];
    if (!candidates?.length || !ranking?.ids.length) continue;

    const rankMap = new Map(ranking.ids.map((id, index) => [id, index + 1]));
    const rankedCandidates = candidates
      .map((candidate) => {
        const rank = rankMap.get(candidate.id) || CANDIDATES_PER_LENS;
        return {
          ...candidate,
          rank,
          score: Math.max(1, 100 - (rank - 1) * 10),
          reason: ranking.rationale,
          selected: rank === 1,
          rejected: rank !== 1,
        };
      })
      .sort((a, b) => a.rank - b.rank);

    candidatesByLens[lensId] = rankedCandidates;
    rewrites[lensId] = rankedCandidates[0].text;
  }

  const observedModels = [...new Set(modelCalls.map((call) => call.observedModel).filter(Boolean))];
  const result: RewriteEngineResult = {
    model,
    observedModels,
    modelCalls,
    promptVersion: REWRITE_PROMPT_VERSION,
    promptFingerprint: REWRITE_PROMPT_FINGERPRINT,
    selectorVersion: REWRITE_SELECTOR_VERSION,
    selectorFingerprint: REWRITE_SELECTOR_FINGERPRINT,
    rewrites,
    candidatesByLens,
    errorsByLens,
    usage,
    latencyMs: Date.now() - startedAt,
  };

  if (process.env.NODE_ENV !== "production" || process.env.FLIPSIDE_REWRITE_DEBUG === "1") {
    console.info(
      "[flipRewriteEngine] runtime",
      JSON.stringify({
        requestedModel: model,
        observedModels,
        promptVersion: result.promptVersion,
        promptFingerprint: result.promptFingerprint,
        selectorVersion: result.selectorVersion,
        selectorFingerprint: result.selectorFingerprint,
        calls: usage.calls,
        latencyMs: result.latencyMs,
      })
    );
  }

  return result;
}
