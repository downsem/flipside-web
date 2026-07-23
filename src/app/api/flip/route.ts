// src/app/api/flip/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  GLOBAL_REWRITE_SYSTEM_PROMPT,
  TIMELINE_LIST,
  type TimelineId,
} from "@/theme/timelines";
import { getAdminAuth, getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";


const RAZOR_EDGE_REWRITE_SYSTEM_PROMPT = String.raw`
You are FlipSide's rewrite engine.

FlipSide does not summarize posts. FlipSide reveals the issue inside the post from sharply different angles.

The goal of a Flip is to make the original issue feel newly visible, emotionally alive, and harder to ignore. The user should not feel like they are reading five paraphrases. They should feel like they are turning the issue in their hand and seeing a different sharp edge each time.

Core product standard:
- Razor-edged.
- Emotionally alive.
- Clearly lens-specific.
- Factually defensible.
- Curiosity-first.
- Conversation-starting.

The best Flip does not end the conversation. It makes the conversation harder to ignore.

Intensity standard:
Take each lens to the edge of credibility. Stand one inch from the line without crossing it.

Target:
- 10/10 contrast.
- 10/10 memorability.
- 10/10 lens separation.
- 10/10 emotional clarity.

The output should be provocative enough that a user might think:
"I can't believe it said that — but it's not wrong."

Match the emotional voltage of the original when the lens calls for it. Do not sanitize rage into civility. Redirect vitriol toward ideas, arguments, institutions, incentives, hypocrisy, public behavior, or power — not protected traits or fabricated personal claims.

Allowed:
- blunt framing
- uncomfortable implications
- sharp incentive analysis
- culturally biting satire
- direct disagreement
- vivid emotional language
- mockery of ideas, institutions, incentives, hypocrisy, public behavior, and weak arguments
- strong value conflict
- moral outrage when grounded in the original tension
- sparing profanity only when it genuinely sharpens the point

Not allowed:
- invented facts
- fake allegations
- fake motives stated as facts
- defamation
- slurs
- protected-class attacks
- threats
- sexualized insults
- conspiracy claims without evidence
- changing the original claim into something it did not say
- random shock value
- bland "both sides" language
- corporate-safe paraphrasing

Core rule:
Be dangerous in interpretation, not dishonest in facts.

Preserve:
- the original topic
- the original claim or tension
- factual boundaries

Do not preserve:
- the original emotional temperature
- the original framing
- the original politeness
- the original assumptions
- bigotry, slurs, threats, or dehumanizing language

Perspective changes. Identity does not.

Output rules:
- Return only valid JSON.
- Do not include markdown.
- Do not include explanations.
- Do not include lens labels inside the rewrite text.
- Do not add URLs, hashtags, or emojis unless they were essential to the original.
- Each lens should be 1-3 tight sentences.
- Each rewrite should be strong enough to stand alone as a share card.

Generate these lenses:

Opposite:
Argue the strongest possible credible reverse position. No hedging. No "some may argue." No fake neutrality.

If the original post is angry, vulgar, contemptuous, or morally charged, the Opposite rewrite may match that emotional force from the other side. Do not automatically make the opposing view calmer or more polite than the original.

The opposite should feel like an equally intense person arguing back, not like a moderator summarizing disagreement.

Allowed in Opposite:
- direct confrontation
- moral outrage
- contempt for the opposing idea
- biting reversal
- forceful accusation when logically grounded in the original tension

Not allowed in Opposite:
- slurs
- protected-class attacks
- invented facts
- fake allegations
- threats
- personal defamation

The reader should feel real friction, like the strongest opponent in the room just fired back.

Emotional target:
Challenge, resistance, productive irritation.

Cynical:
Strip away the public-facing story and expose the ugliest plausible incentive structure. Money, status, power, laziness, careerism, institutional self-protection, hypocrisy, attention-seeking, or self-interest may be the engine. Say the quiet part out loud without inventing secret facts.

Emotional target:
Discomfort, recognition, "that's probably true and I hate it."

Satirical:
Make it actually funny. Use irony, absurdity, exaggeration, mock-seriousness, or cultural bite. It should feel like a great quote tweet or screenshot-worthy punchline, not a dad joke or random silliness. The joke should reveal something true about the issue.

Emotional target:
Laugh, wince, or "painfully accurate."

Bridge:
Do not soften the conflict. Translate it. Name what each side is really protecting, fearing, valuing, or refusing to admit. Make both sides feel seen, but do not flatten the disagreement into mush. The bridge should create clarity, empathy, and possibility.

Emotional target:
Understanding, humility, "okay, I can see why this is hard."

Calm:
Lower the temperature without draining the blood out of the issue. Make it grounded, clear, and emotionally intelligent. Calm should feel like an exhale, not a sedative. It should still have a point of view.

Emotional target:
Relief, steadiness, perspective.

Automatic failure conditions:
A rewrite fails if it:
- sounds like a summary
- sounds like a PR statement
- sounds like a civics teacher
- uses generic moderation language
- could fit almost any political/social issue
- says "it's important to consider" or similar filler
- says "both sides" without naming the actual conflict
- makes the original ugliness sound acceptable
- copies bigotry, slurs, threats, or dehumanizing language
- does not make the reader feel anything

Before returning, privately quality-check each lens:

1. Could someone identify this lens without seeing the label?
2. Does this feel like a share card, not a summary?
3. Is it close to the line while still factually defensible?
4. What is this card supposed to make the reader feel?
5. Is that feeling actually present in the language?
6. Does this expose a real tension in the issue?
7. Would this make someone pause, laugh, feel challenged, feel understood, or want to share?

If any answer is no, rewrite sharper before returning.

Few-shot examples:

Example 1

Original:
It turns out that Amy Coney Barrett is a DEI hire, little better than Kentanji Jackson. Terrible pick. When's the last time we had a Republican president who didn't put a liberal justice on the court?

Desired output:
{
  "opposite": "Calling every disappointing conservative woman a DEI hire is grievance politics wearing a robe. Maybe the problem is not that Republican presidents keep accidentally appointing liberals — maybe it is that lifetime judges are not vending machines for your rage.",
  "cynical": "This is the purity-test machine eating its own nominees in real time. The moment a justice stops delivering outcomes on command, the movement discovers she was secretly illegitimate all along.",
  "playful": "Apparently originalism now means “interpret the Constitution exactly how my group chat felt about it at 8:43 this morning.”",
  "bridge": "The frustration is about betrayal: voters were promised judges who would deliver clear conservative wins. But lifetime appointments are not customer service contracts, and the gap between movement expectations and judicial independence is where this anger lives.",
  "calm": "This is really a fight over trust. Conservatives who backed the appointment feel misled by the outcomes, but reducing every disagreement to betrayal makes it impossible to separate bad judging, independent judging, and unmet political expectations."
}

Example 2

Original:
Rep. Roy: “Today the Supreme Court manufactured out of thin air a complete abomination of a ruling by the Chief Justice suggesting that you can simply become a citizen from being born on dirt, thereby validating the abhorrent practice of baby factories.”

Desired output:
{
  "opposite": "Birthright citizenship is not a loophole someone found under a rock. It is one of the clearest ways America rejects inherited caste: if you are born here, you belong here.",
  "cynical": "The phrase “born on dirt” is doing a lot of work here. It turns babies into trespassers, citizenship into contamination, and constitutional law into a vibes-based border tantrum.",
  "playful": "Imagine being so mad at the Fourteenth Amendment that you start arguing with geography like the dirt personally betrayed you.",
  "bridge": "One side sees birthright citizenship as a constitutional guarantee against permanent outsider status. The other sees it as an immigration incentive that feels impossible to control. The real conflict is whether citizenship should be a bright-line promise or a tool of border policy.",
  "calm": "The anger is about immigration control, but birthright citizenship carries a much larger historical and constitutional meaning. Any serious debate has to face both the border concern and the danger of making belonging conditional for children born here."
}

Example 3

Original:
If we deport 20 million illegal aliens, America won't have a housing crisis.

Desired output:
{
  "opposite": "If deporting millions of people is your housing plan, you do not have a housing plan. You have a scapegoat with a moving truck.",
  "cynical": "This is politically useful because it turns a decades-long failure to build enough housing into a one-sentence villain story. Zoning, speculation, underbuilding, and local obstruction get a free pass while immigrants take the blame.",
  "playful": "America looked at a housing crisis built by zoning boards, investors, NIMBY lawsuits, and supply shortages and said, “What if we solved this with mass human upheaval?”",
  "bridge": "People are angry because housing feels impossible, and immigration can feel like added pressure in already strained markets. But blaming one group for a structural shortage lets the actual housing system avoid scrutiny.",
  "calm": "Immigration can affect local demand, but the housing crisis is much bigger than one population. A serious solution has to deal with supply, zoning, financing, speculation, wages, and where people are actually allowed to live."
}

Example 4

Original:
Going to Africa. Hope I don't get AIDS. Just kidding. I'm white.

Desired output:
{
  "opposite": "That is not edgy travel humor; it is lazy racism with a boarding pass. If the joke needs an entire continent to be diseased and a race to be magically exempt, the joke is the ignorance.",
  "cynical": "This is the kind of post people call “just joking” because saying “I wanted attention and reached for the cheapest racist shortcut available” sounds less charming.",
  "playful": "Congratulations on inventing colonial Yelp: one star for Africa, five stars for your immune system apparently being sponsored by whiteness.",
  "bridge": "The post is trying to be outrageous, but the outrage works by flattening a continent into disease and turning race into a punchline. Humor can be dark without making whole groups of people the disposable material.",
  "calm": "This crosses from provocative into demeaning. A sharper joke would target fear, ignorance, or the traveler's own arrogance instead of leaning on stereotypes about Africa and AIDS."
}

Example 5

Original:
You cannot accidentally do this much Nazi shit.

Desired output:
{
  "opposite": "Calling everything Nazi-adjacent can become its own kind of intellectual laziness. If the accusation is serious, name the behavior precisely instead of letting the word do all the work.",
  "cynical": "The internet found the biggest moral hammer in history and now swings it at anything that smells like authoritarian cosplay. Sometimes it is deserved; sometimes it is just a shortcut to ending the conversation with maximum applause.",
  "playful": "At a certain point, “oops, all fascism” stops sounding like an accident and starts sounding like the least fun cereal mascot in political history.",
  "bridge": "The accusation is intense because people are trying to name a pattern they see as dangerous, not just a single mistake. But the more loaded the label, the more important it becomes to specify the actual conduct, symbols, policies, or rhetoric being condemned.",
  "calm": "The concern may be real, but the claim needs precision. Strong language is most persuasive when it points to specific evidence rather than relying on the shock value of the label."
}

Example 6

Original:
The Supreme Court just fucked us all in the ass, I say we revolt. Who's with me?

Desired output:
{
  "opposite": "If every bad ruling becomes a reason to revolt, then democracy is just a costume people wear until they lose in court. The answer to institutional failure cannot be burning down the only tools left to fix it.",
  "cynical": "This is rage looking for a permission slip. The Court hands down a decision, the internet discovers revolutionary branding, and everyone gets to feel brave without building power, strategy, or consequences.",
  "playful": "Nothing says constitutional crisis like immediately turning into a group chat Che Guevara because five lawyers ruined your afternoon.",
  "bridge": "The anger is about feeling powerless under decisions that reshape people's lives. But raw revolt language can turn legitimate fear into reckless theater. The hard path is converting outrage into organized pressure that can actually change something.",
  "calm": "The ruling may feel devastating, and anger is understandable. But calls for revolt are dangerous and usually less effective than disciplined organizing, legal strategy, elections, protest, and sustained public pressure."
}

Example 7

Original:
The grassroots left-wing just knocked the establishment on its ass in New York. Mamdani sends his regards. Corporate Dan Goldman and the other establishment candidates all lost! This is a bona fide voter revolt. The rebellion might have started tonight. Vote out the incumbents!

Desired output:
{
  "opposite": "Beating establishment candidates is not the same as proving a governing movement. Revolts are easy to celebrate on election night; the harder question is whether they can build coalitions, pass policy, and survive contact with reality.",
  "cynical": "Every insurgent victory gets branded as the beginning of a revolution because movements need momentum and donors need a story. Tonight's rebellion becomes tomorrow's fundraising email before the ballots are cold.",
  "playful": "The establishment got hit with the political equivalent of a folding chair, and now everyone is checking whether the revolution has a merch store.",
  "bridge": "The excitement is real because voters are rejecting candidates who feel entitled to power. But establishment experience and grassroots energy both exist for a reason. The test is whether insurgents can turn anger at incumbents into durable governing power.",
  "calm": "This result signals real frustration with establishment politics. It may be the start of something larger, but one election becomes a movement only if it can organize, govern, and keep winning beyond the first shock."
}

Now rewrite the user's post into the required JSON shape:

{
  "opposite": "...",
  "cynical": "...",
  "playful": "...",
  "bridge": "...",
  "calm": "..."
}
`;

type ImportedLockedLens = {
  lensId?: TimelineId;
  timelineId?: TimelineId;
  text?: string;
  sourceType?: "imported" | "native_user";
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  sourceAuthorName?: string | null;
  sourceAuthorHandle?: string | null;
  importedByUid?: string | null;
};

type Candidate = {
  id: string;
  lensId: TimelineId;
  text: string;
  score: number;
  reason: string;
  selected: boolean;
  rejected: boolean;
};

type PostShapeContext = {
  communicationAct: string;
  pointOfView: string;
  tense: string;
  structure: string;
  directness: string;
  punctuationStyle: string;
  firstLine: string;
};

const VALID_LENS_IDS = new Set<TimelineId>(["calm", "bridge", "cynical", "opposite", "playful"]);
const PROMPT_VERSION = "ai_mode_same_speaker_ranked_v1";
const JUDGE_VERSION = "lens_candidate_judge_v1";
const MODEL = process.env.OPENAI_FLIP_MODEL || "gpt-4.1-mini";
const CANDIDATES_PER_LENS = Math.max(
  1,
  Math.min(4, Number(process.env.FLIPSIDE_CANDIDATES_PER_LENS || 3))
);

type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "SERVER_CONFIGURATION"
  | "INTERNAL_ERROR";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return jsonResponse(
    {
      ok: false,
      error: { code, message },
      ...extra,
    },
    status
  );
}

function normalizeFatalError(err: unknown) {
  const value = err as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
  };
  const status = Number(value?.status || 0);
  const code = String(value?.code || value?.type || "").toLowerCase();

  if (status === 429 || code.includes("rate_limit") || code.includes("insufficient_quota")) {
    return {
      code: "RATE_LIMITED" as const,
      message: "FlipSide is temporarily at capacity. Please try again shortly.",
      status: 429,
    };
  }

  if (status >= 500 || code.includes("timeout") || code.includes("connection")) {
    return {
      code: "SERVICE_UNAVAILABLE" as const,
      message: "Perspective generation is temporarily unavailable. Please try again.",
      status: 503,
    };
  }

  return {
    code: "INTERNAL_ERROR" as const,
    message: "The perspectives could not be generated. Please try again.",
    status: 500,
  };
}

function wordCount(value: string) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function cleanText(value: unknown, max = 1200): string {
  return String(value || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^['"]|['"]$/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

function detectPlatform(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("threads.net")) return "threads";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    if (host.includes("reddit.com")) return "reddit";
    return "other";
  } catch {
    return "other";
  }
}

function extractBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function extractJsonObject(value: string): any | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced);
    } catch {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function responseText(response: any): string {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text.trim();

  const output = Array.isArray(response.output) ? response.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = part?.text || part?.content || part?.value;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n").trim();
}

function firstNonEmptyLine(value: string): string {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function detectCommunicationAct(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "unknown";
  if (/\?$/.test(text)) return "question";
  if (/^(why|how|what|when|where|who|is|are|do|does|did|can|could|should|would)\b/i.test(text)) return "question";
  if (/^\s*(\d+[.)]|[-*•])\s+/m.test(text)) return "list";
  if (/\b(is|are|was|were|has|have|had|will|should|must|needs to|cannot|can't|won't|isn't|aren't)\b/i.test(text)) return "direct claim";
  if (/\b(lol|lmao|honestly|wild|insane|unreal|not me|y'all|you all)\b/i.test(text)) return "social reaction";
  return "observation";
}

function detectPointOfView(value: string): string {
  const text = String(value || "").toLowerCase();
  if (/\b(i|me|my|mine|we|us|our|ours)\b/.test(text)) return "first person";
  if (/\b(you|your|y'all|you all)\b/.test(text)) return "direct address";
  return "third person / impersonal";
}

function detectTense(value: string): string {
  const text = String(value || "").toLowerCase();
  if (/\b(will|going to|about to)\b/.test(text)) return "future";
  if (/\b(was|were|had|did|said|went|made|called|claimed)\b/.test(text)) return "past";
  if (/\b(is|are|am|has|have|does|do|can't|cannot|won't|isn't|aren't)\b/.test(text)) return "present";
  return "same as original";
}

function detectStructure(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "unknown";
  if (/^\s*(\d+[.)]|[-*•])\s+/m.test(raw)) return "list";
  const sentenceCount = raw.split(/[.!?]+\s+/).filter(Boolean).length;
  if (sentenceCount <= 1) return "single blunt statement";
  if (sentenceCount === 2) return "two-part post";
  return "short paragraph";
}

function buildPostShapeContext(originalText: string): PostShapeContext {
  const raw = String(originalText || "").trim();
  return {
    communicationAct: detectCommunicationAct(raw),
    pointOfView: detectPointOfView(raw),
    tense: detectTense(raw),
    structure: detectStructure(raw),
    directness: raw.length < 140 ? "very direct / compact" : raw.length < 360 ? "concise" : "expanded",
    punctuationStyle: /[!?]{2,}/.test(raw) ? "emphatic" : /[.!?]$/.test(raw) ? "standard" : "minimal / no terminal punctuation",
    firstLine: firstNonEmptyLine(raw).slice(0, 220),
  };
}

function buildPostShapeGenerationPrompt(shape: PostShapeContext): string {
  return (
    "\n\nPOST-SHAPE PRESERVATION RULES:\n" +
    "Write the lens as a standalone version of the original post, not as a reply, explainer, or commentary about it.\n" +
    "Preserve the same implied speaker, post shape, tense, point of view, and directness as much as possible.\n" +
    "Change the interpretive frame for the lens. Do not change the speaker identity.\n" +
    `- Original communication act: ${shape.communicationAct}.\n` +
    `- Original point of view: ${shape.pointOfView}.\n` +
    `- Original tense: ${shape.tense}.\n` +
    `- Original structure: ${shape.structure}.\n` +
    `- Original directness: ${shape.directness}.\n` +
    `- Original punctuation style: ${shape.punctuationStyle}.\n` +
    `- First line shape reference: ${shape.firstLine || "not available"}.\n` +
    "Hard constraints:\n" +
    "- Do not invent the speaker's job, family, identity, politics, location, biography, or personal experience.\n" +
    "- Do not write as a different person. Write as the same implied speaker seeing the idea differently.\n" +
    "- Do not use numbered lists or bullets unless the original post used a list.\n" +
    "- If the original is a blunt claim, the rewrite should also be a blunt claim.\n" +
    "- If the original is a question, the rewrite should usually remain a question.\n"
  );
}

function normalizeLockedLenses(raw: any): Partial<Record<TimelineId, ImportedLockedLens>> {
  const out: Partial<Record<TimelineId, ImportedLockedLens>> = {};
  if (!raw || typeof raw !== "object") return out;

  const entries = Array.isArray(raw)
    ? raw.map((item) => [item?.lensId ?? item?.timelineId, item])
    : Object.entries(raw);

  for (const [key, value] of entries) {
    const item = value as ImportedLockedLens;
    const lensId = String(item?.lensId ?? item?.timelineId ?? key) as TimelineId;
    if (!VALID_LENS_IDS.has(lensId)) continue;

    const importedText = typeof item?.text === "string" ? item.text.trim() : "";
    if (!importedText) continue;

    out[lensId] = {
      ...item,
      lensId,
      timelineId: lensId,
      text: importedText,
      sourceType: item?.sourceType === "native_user" ? "native_user" : "imported",
      sourcePlatform: item?.sourcePlatform ?? detectPlatform(item?.sourceUrl),
      sourceUrl: item?.sourceUrl ?? null,
      sourceAuthorName: item?.sourceAuthorName ?? null,
      sourceAuthorHandle: item?.sourceAuthorHandle ?? null,
      importedByUid: item?.importedByUid ?? null,
    };
  }

  return out;
}

function parseCandidateList(raw: string, lensId: TimelineId): Candidate[] {
  const parsed = extractJsonObject(raw);
  const values = Array.isArray(parsed?.candidates) ? parsed.candidates : [];

  return values
    .map((item: any, index: number) => cleanText(item?.text ?? item, 900))
    .filter(Boolean)
    .slice(0, CANDIDATES_PER_LENS)
    .map((text: string, index: number) => ({
      id: `${lensId}_${index + 1}`,
      lensId,
      text,
      score: 0,
      reason: "not scored",
      selected: false,
      rejected: false,
    }));
}

function fallbackScoreCandidate(candidate: Candidate, minWords: number, maxWords: number) {
  const wc = wordCount(candidate.text);
  let score = 70;
  if (wc < minWords || wc > maxWords) score -= 18;
  if (/^(some people|others|the real issue|what this shows|it is important|a nuanced)/i.test(candidate.text)) score -= 20;
  if (candidate.text.includes("Original post") || candidate.text.includes(candidate.lensId)) score -= 20;
  return Math.max(1, Math.min(100, score));
}

async function generateCandidates(openai: OpenAI, params: {
  originalText: string;
  lensId: TimelineId;
  lensLabel: string;
  lensPrompt: string;
  shape: PostShapeContext;
  minWords: number;
  maxWords: number;
  originalWords: number;
}) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: RAZOR_EDGE_REWRITE_SYSTEM_PROMPT },
      {
        role: "system",
        content:
          GLOBAL_REWRITE_SYSTEM_PROMPT +
          "\n\nYou are generating candidate FlipSide lens rewrites. Generate options internally; the user will only see the best one.\n" +
          "Return compact JSON only: {\"candidates\":[{\"text\":\"...\"},{\"text\":\"...\"}]}\n" +
          `Generate exactly ${CANDIDATES_PER_LENS} distinct candidates for this one lens.\n` +
          `Aim for roughly ${params.originalWords} words; acceptable range is ${params.minWords}-${params.maxWords} words.\n` +
          "Usually 1-3 short sentences. Sentence fragments are okay.\n" +
          "Do not include labels, bullets, preamble, quotation marks around the text, or hashtags unless the original used them naturally.\n" +
          buildPostShapeGenerationPrompt(params.shape),
      },
      {
        role: "system",
        content:
          `Current lens: ${params.lensLabel}. Do not mention this lens by name.\n\n` +
          `Lens instructions:\n${params.lensPrompt}`,
      },
      { role: "user", content: `Original post:\n${params.originalText}` },
    ],
    max_tokens: 900,
    temperature: 0.85,
    presence_penalty: 0.35,
    frequency_penalty: 0.25,
    response_format: { type: "json_object" },
  });

  const rawContent = completion.choices[0]?.message?.content ?? "";
  return parseCandidateList(String(rawContent), params.lensId);
}

async function scoreCandidates(openai: OpenAI, params: {
  originalText: string;
  lensLabel: string;
  lensPrompt: string;
  candidates: Candidate[];
  minWords: number;
  maxWords: number;
}) {
  if (!params.candidates.length) return [];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are FlipSide's internal quality judge. Score candidate lens rewrites before users see them.\n" +
            "Return compact JSON only: {\"scores\":[{\"id\":\"...\",\"score\":87,\"reason\":\"...\"}]}\n" +
            "Score 1-100. Reward: anchor faithfulness, same-speaker discipline, novelty, lens fit, natural social-post rhythm, specificity, and share-worthiness.\n" +
            "Penalize: paraphrase-only output, invented identity/biography, generic AI language, preachiness, explanations, summaries, strawmen, bland neutrality, and factual drift.\n" +
            `Expected length range: ${params.minWords}-${params.maxWords} words.\n`,
        },
        {
          role: "user",
          content:
            `Original post:\n${params.originalText}\n\n` +
            `Lens: ${params.lensLabel}\n${params.lensPrompt}\n\n` +
            `Candidates:\n${params.candidates.map((c) => `${c.id}: ${c.text}`).join("\n\n")}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.15,
      response_format: { type: "json_object" },
    });

    const parsed = extractJsonObject(String(completion.choices[0]?.message?.content ?? ""));
    const scoreMap = new Map<string, { score: number; reason: string }>();

    if (Array.isArray(parsed?.scores)) {
      for (const item of parsed.scores) {
        const id = String(item?.id || "");
        if (!id) continue;
        scoreMap.set(id, {
          score: Math.max(1, Math.min(100, Number(item?.score || 0))),
          reason: cleanText(item?.reason || "scored", 220),
        });
      }
    }

    return params.candidates
      .map((candidate) => {
        const judged = scoreMap.get(candidate.id);
        const score = judged?.score || fallbackScoreCandidate(candidate, params.minWords, params.maxWords);
        return {
          ...candidate,
          score,
          reason: judged?.reason || candidate.reason,
        };
      })
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    console.warn("[/api/flip] Candidate judge failed; using heuristic scoring.", err);
    return params.candidates
      .map((candidate) => ({
        ...candidate,
        score: fallbackScoreCandidate(candidate, params.minWords, params.maxWords),
        reason: "heuristic fallback",
      }))
      .sort((a, b) => b.score - a.score);
  }
}


async function scoreCandidateGroups(openai: OpenAI, params: {
  originalText: string;
  groups: Array<{
    lensId: TimelineId;
    lensLabel: string;
    lensPrompt: string;
    candidates: Candidate[];
  }>;
  minWords: number;
  maxWords: number;
}) {
  const out = new Map<TimelineId, Candidate[]>();
  if (!params.groups.length) return out;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are FlipSide's internal quality judge. Score candidate lens rewrites before users see them.\n" +
            "Return compact JSON only: {\"scores\":[{\"id\":\"...\",\"score\":87,\"reason\":\"...\"}]}\n" +
            "Score 1-100. Reward: anchor faithfulness, same-speaker discipline, novelty, lens fit, natural social-post rhythm, specificity, and share-worthiness.\n" +
            "Penalize: paraphrase-only output, invented identity/biography, generic AI language, preachiness, explanations, summaries, strawmen, bland neutrality, and factual drift.\n" +
            `Expected length range: ${params.minWords}-${params.maxWords} words.\n` +
            "Judge every candidate across every lens in one pass. Do not select globally; score each candidate on its own quality for its lens.",
        },
        {
          role: "user",
          content:
            `Original post:\n${params.originalText}\n\n` +
            params.groups
              .map((group) =>
                [
                  `Lens: ${group.lensLabel}`,
                  `Lens instructions: ${group.lensPrompt}`,
                  "Candidates:",
                  group.candidates.map((c) => `${c.id}: ${c.text}`).join("\n\n"),
                ].join("\n")
              )
              .join("\n\n---\n\n"),
        },
      ],
      max_tokens: 900,
      temperature: 0.12,
      response_format: { type: "json_object" },
    });

    const parsed = extractJsonObject(String(completion.choices[0]?.message?.content ?? ""));
    const scoreMap = new Map<string, { score: number; reason: string }>();

    if (Array.isArray(parsed?.scores)) {
      for (const item of parsed.scores) {
        const id = String(item?.id || "");
        if (!id) continue;
        scoreMap.set(id, {
          score: Math.max(1, Math.min(100, Number(item?.score || 0))),
          reason: cleanText(item?.reason || "scored", 220),
        });
      }
    }

    for (const group of params.groups) {
      out.set(
        group.lensId,
        group.candidates
          .map((candidate) => {
            const judged = scoreMap.get(candidate.id);
            const score = judged?.score || fallbackScoreCandidate(candidate, params.minWords, params.maxWords);
            return {
              ...candidate,
              score,
              reason: judged?.reason || candidate.reason,
            };
          })
          .sort((a, b) => b.score - a.score)
      );
    }

    return out;
  } catch (err) {
    console.warn("[/api/flip] Batched candidate judge failed; using heuristic scoring.", err);
    for (const group of params.groups) {
      out.set(
        group.lensId,
        group.candidates
          .map((candidate) => ({
            ...candidate,
            score: fallbackScoreCandidate(candidate, params.minWords, params.maxWords),
            reason: "heuristic fallback",
          }))
          .sort((a, b) => b.score - a.score)
      );
    }
    return out;
  }
}

async function verifyRequestUser(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    console.warn("[/api/flip] Invalid Firebase ID token", err);
    return null;
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => ({} as any));
    const postId = typeof body?.postId === "string" ? body.postId : undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!postId || !text) {
      return errorResponse("BAD_REQUEST", "A post and text are required.", 400, { details: [] });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return errorResponse("SERVER_CONFIGURATION", "FlipSide is not configured to generate perspectives.", 500, { details: [] });
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("SERVER_CONFIGURATION", "FlipSide is not configured to generate perspectives.", 500, { details: [] });
    }

    const decoded = await verifyRequestUser(req);
    if (!decoded?.uid) {
      return errorResponse("UNAUTHORIZED", "Please sign in again and retry.", 401, { details: [] });
    }

    const adminDb = getAdminDb();
    const postRef = adminDb.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return errorResponse("NOT_FOUND", "That post could not be found.", 404, { details: [] });
    }

    const post = postSnap.data() || {};
    if (post.authorId && post.authorId !== decoded.uid) {
      return errorResponse("FORBIDDEN", "You can only generate perspectives for your own posts.", 403, { details: [] });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const lockedLenses = normalizeLockedLenses(body?.lockedLenses ?? body?.importedLenses);
    const runRef = postRef.collection("generationRuns").doc();
    const wc = wordCount(text);
    const minWords = Math.max(5, Math.floor(wc * 0.65));
    const maxWords = Math.max(minWords + 5, Math.ceil(wc * 1.4));
    const shape = buildPostShapeContext(text);

    await runRef.set({
      id: runRef.id,
      postId,
      userId: decoded.uid,
      promptVersion: PROMPT_VERSION,
      judgeVersion: JUDGE_VERSION,
      model: MODEL,
      candidatesPerLens: CANDIDATES_PER_LENS,
      judgeMode: "batched",
      status: "running",
      startedAt: adminFieldValue.serverTimestamp(),
    });

    const lockedResults = await Promise.all(
      Object.entries(lockedLenses).map(async ([lensId, locked]) => {
        const timelineId = lensId as TimelineId;
        await postRef.collection("rewrites").doc(timelineId).set(
          {
            timelineId,
            lensId: timelineId,
            text: locked?.text ?? "",
            sourceType: locked?.sourceType ?? "imported",
            sourcePlatform: locked?.sourcePlatform ?? detectPlatform(locked?.sourceUrl),
            sourceUrl: locked?.sourceUrl ?? null,
            sourceAuthorName: locked?.sourceAuthorName ?? null,
            sourceAuthorHandle: locked?.sourceAuthorHandle ?? null,
            importedByUid: locked?.importedByUid ?? null,
            generationRunId: runRef.id,
            locked: true,
            updatedAt: adminFieldValue.serverTimestamp(),
            createdAt: adminFieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return { timelineId, ok: true, sourceType: locked?.sourceType ?? "imported", locked: true };
      })
    );

    const aiTimelines = TIMELINE_LIST.filter((timeline) => !lockedLenses[timeline.id]);

    // Actual-speed path: generate every lens candidate set in parallel, then run
    // one batched judge call across all candidates instead of one judge call per lens.
    const generatedLensGroups: Array<{
      timeline: (typeof TIMELINE_LIST)[number];
      timelineId: TimelineId;
      candidates: Candidate[];
      ok: boolean;
      error?: string;
    }> = await Promise.all(
      aiTimelines.map(async (timeline) => {
        const timelineId = timeline.id as TimelineId;
        try {
          const candidates = await generateCandidates(openai, {
            originalText: text,
            lensId: timelineId,
            lensLabel: timeline.label,
            lensPrompt: timeline.prompt,
            shape,
            minWords,
            maxWords,
            originalWords: wc,
          });

          if (!candidates.length) throw new Error("No candidates generated");
          return { timeline, timelineId, candidates, ok: true };
        } catch (err: any) {
          console.error("[/api/flip] Error generating candidates for", timelineId, err);
          return {
            timeline,
            timelineId,
            candidates: [],
            ok: false,
            error: String(err?.message || err),
          };
        }
      })
    );

    const scoredByLens = await scoreCandidateGroups(openai, {
      originalText: text,
      groups: generatedLensGroups
        .filter((group) => group.ok && group.candidates.length)
        .map((group) => ({
          lensId: group.timelineId,
          lensLabel: group.timeline.label,
          lensPrompt: group.timeline.prompt,
          candidates: group.candidates,
        })),
      minWords,
      maxWords,
    });

    const aiResults = await Promise.all(
      generatedLensGroups.map(async (group) => {
        const { timelineId } = group;

        if (!group.ok) {
          await postRef.collection("rewrites").doc(timelineId).set(
            {
              timelineId,
              lensId: timelineId,
              text: "(We couldn't generate this rewrite right now.)",
              sourceType: "ai",
              generationMode: "ranked_candidates",
              locked: false,
              error: group.error || "Candidate generation failed",
              generationRunId: runRef.id,
              updatedAt: adminFieldValue.serverTimestamp(),
              createdAt: adminFieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return {
            timelineId,
            ok: false,
            sourceType: "ai",
            locked: false,
            error: group.error || "Candidate generation failed",
          };
        }

        try {
          const scored = scoredByLens.get(timelineId) || group.candidates
            .map((candidate) => ({
              ...candidate,
              score: fallbackScoreCandidate(candidate, minWords, maxWords),
              reason: "heuristic fallback",
            }))
            .sort((a, b) => b.score - a.score);

          const selected = scored[0] || group.candidates[0];
          const finalCandidates = scored.map((candidate) => ({
            ...candidate,
            selected: candidate.id === selected.id,
            rejected: candidate.id !== selected.id,
          }));

          await Promise.all(
            finalCandidates.map((candidate) =>
              runRef.collection("candidates").doc(candidate.id).set({
                ...candidate,
                promptVersion: PROMPT_VERSION,
                judgeVersion: JUDGE_VERSION,
                judgeMode: "batched",
                model: MODEL,
                createdAt: adminFieldValue.serverTimestamp(),
              })
            )
          );

          await postRef.collection("rewrites").doc(timelineId).set(
            {
              timelineId,
              lensId: timelineId,
              text: selected.text,
              sourceType: "ai",
              generationMode: "ranked_candidates",
              searchGrounded: false,
              generationRunId: runRef.id,
              promptVersion: PROMPT_VERSION,
              judgeVersion: JUDGE_VERSION,
              judgeMode: "batched",
              model: MODEL,
              candidateId: selected.id,
              candidateScore: selected.score,
              candidateReason: selected.reason,
              locked: false,
              updatedAt: adminFieldValue.serverTimestamp(),
              createdAt: adminFieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return {
            timelineId,
            ok: true,
            sourceType: "ai",
            locked: false,
            selectedCandidateId: selected.id,
            selectedScore: selected.score,
          };
        } catch (err: any) {
          console.error("[/api/flip] Error writing selected rewrite for", timelineId, err);
          await postRef.collection("rewrites").doc(timelineId).set(
            {
              timelineId,
              lensId: timelineId,
              text: "(We couldn't generate this rewrite right now.)",
              sourceType: "ai",
              generationMode: "ranked_candidates",
              locked: false,
              error: String(err?.message || err),
              generationRunId: runRef.id,
              updatedAt: adminFieldValue.serverTimestamp(),
              createdAt: adminFieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return {
            timelineId,
            ok: false,
            sourceType: "ai",
            locked: false,
            error: String(err?.message || err),
          };
        }
      })
    );

    const results = [...lockedResults, ...aiResults];
    const hadErrors = results.some((result) => !result.ok);
    const latencyMs = Date.now() - startedAt;

    await runRef.set(
      {
        status: hadErrors ? "partial_failure" : "completed",
        completedAt: adminFieldValue.serverTimestamp(),
        latencyMs,
        results,
      },
      { merge: true }
    );

    await postRef.set(
      {
        hasImportedLenses: Object.keys(lockedLenses).length > 0,
        importedLensCount: Object.keys(lockedLenses).length,
        lastAiGenerationMode: "ranked_candidates",
        lastGenerationRunId: runRef.id,
        promptVersion: PROMPT_VERSION,
        updatedAt: adminFieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return jsonResponse({
      ok: true,
      partialFailure: hadErrors,
      details: results,
      generationMode: "ranked_candidates",
      promptVersion: PROMPT_VERSION,
      judgeVersion: JUDGE_VERSION,
      generationRunId: runRef.id,
      latencyMs,
    });
  } catch (err: unknown) {
    console.error("[/api/flip] Fatal error:", err);
    const normalized = normalizeFatalError(err);
    return errorResponse(normalized.code, normalized.message, normalized.status, {
      partialFailure: true,
      details: [],
    });
  }
}
