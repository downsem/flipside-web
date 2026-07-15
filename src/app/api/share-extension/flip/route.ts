import OpenAI from "openai";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";


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

export const runtime = "nodejs";
export const maxDuration = 60;

type LensId = "original" | "opposite" | "cynical" | "playful" | "bridge" | "calm";

const MODEL = process.env.OPENAI_SHARE_EXTENSION_MODEL || process.env.OPENAI_FLIP_MODEL || "gpt-4.1-mini";
const LENS_IDS: LensId[] = ["opposite", "cynical", "playful", "bridge", "calm"];
const COLLECTION = "shareExtensionDecks";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function cleanText(value: unknown, max = 2200): string {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function detectPlatform(url?: string | null): string {
  try {
    const host = new URL(url || "").hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("threads.net") || host.includes("threads.com")) return "threads";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  } catch {}
  return "external";
}

function normalizeUrl(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function stripSharedUrlBoilerplate(value: string): string {
  const raw = cleanText(value, 2200);
  if (!raw) return "";

  const withoutUrls = raw
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\b(?:threads\.net|x\.com|twitter\.com|bsky\.app)\S*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const boilerplatePatterns = [
    /^shared\s+(?:a\s+)?post\s+from\s+threads\s*:?\s*/i,
    /^check\s+out\s+this\s+post\s+on\s+threads\s*:?\s*/i,
    /^view\s+on\s+threads\s*:?\s*/i,
  ];

  let cleaned = withoutUrls;
  for (const pattern of boilerplatePatterns) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  return cleaned;
}

function hasMeaningfulSharedText(value: string): boolean {
  const cleaned = stripSharedUrlBoilerplate(value);
  if (!cleaned) return false;

  const alphaNumeric = cleaned.replace(/[^\p{L}\p{N}]+/gu, "");
  return alphaNumeric.length >= 12 || wordCount(cleaned) >= 3;
}

function targetRange(text: string) {
  const wc = wordCount(text);
  const minWords = Math.max(5, Math.floor(wc * 0.65));
  const maxWords = Math.max(minWords + 5, Math.ceil(wc * 1.35));
  return { minWords, maxWords };
}

function makeDeckId() {
  return `share_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

async function hydrateSource(origin: string, url: string, sharedText: string) {
  try {
    const res = await fetch(`${origin}/api/import-social-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, sharedText }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) return json;
    return null;
  } catch (err) {
    console.warn("[/api/share-extension/flip] import hydration failed", err);
    return null;
  }
}

function buildPrompt(originalText: string) {
  const { minWords, maxWords } = targetRange(originalText);
  return `You are FlipSide. Rewrite the same post through five lenses.

Rules:
- Keep the same speaker and basic subject.
- Do not add facts, names, claims, statistics, or events not implied by the original.
- Do not explain the lens. Return only the rewritten post text for each lens.
- Keep each rewrite roughly ${minWords}-${maxWords} words unless the original is extremely short.
- Opposite: argue the other side clearly.
- Cynical: expose incentives, tradeoffs, bad-faith possibilities, or hidden costs.
- Satirical/playful: sharper, more surprising, lightly satirical, not goofy filler.
- Bridge: find common ground and make the idea easier for both sides to hear.
- Calm: lower the temperature while preserving the point.

Return valid JSON with exactly these keys:
{
  "opposite": "...",
  "cynical": "...",
  "playful": "...",
  "bridge": "...",
  "calm": "..."
}

Original post:
${originalText}`;
}

function normalizeDeck(parsed: Record<string, unknown>, originalText: string) {
  const deck: Record<LensId, string> = {
    original: originalText,
    opposite: "",
    cynical: "",
    playful: "",
    bridge: "",
    calm: "",
  };

  for (const id of LENS_IDS) {
    deck[id] = cleanText(parsed[id], 1400);
  }

  return deck;
}

async function storeShareExtensionDeck(deckId: string, payload: Record<string, unknown>) {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(deckId).set({
    deckId,
    payload,
    createdAt: adminFieldValue.serverTimestamp(),
    updatedAt: adminFieldValue.serverTimestamp(),
    source: "ios_share_extension",
  }, { merge: true });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const deckId = cleanText(url.searchParams.get("deckId"), 120);
    if (!deckId) return jsonResponse({ ok: false, error: "Missing deckId" }, 400);

    const snap = await getAdminDb().collection(COLLECTION).doc(deckId).get();
    if (!snap.exists) return jsonResponse({ ok: false, error: "Deck not found" }, 404);

    const data = snap.data() || {};
    const payload = (data.payload || {}) as Record<string, unknown>;
    return jsonResponse({ ...payload, ok: true, deckId, stored: true });
  } catch (err: any) {
    console.error("[/api/share-extension/flip] GET failed", err);
    return jsonResponse({ ok: false, error: err?.message || "Could not load Flip Deck" }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = normalizeUrl((body as any)?.url);
    const sharedText = cleanText((body as any)?.sharedText, 1800);

    if (!url && !sharedText) {
      return jsonResponse({ ok: false, error: "Missing url or sharedText" }, 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ ok: false, error: "Missing OPENAI_API_KEY" }, 500);
    }

    const origin = new URL(req.url).origin;
    const imported = url ? await hydrateSource(origin, url, sharedText) : null;

    const platform =
      imported?.platform ||
      imported?.sourcePlatform ||
      detectPlatform(url);

    const cleanedSharedText = stripSharedUrlBoilerplate(sharedText);
    const useSharedTextFirst =
      platform === "threads" &&
      hasMeaningfulSharedText(sharedText);

    const sourceText = cleanText(
      useSharedTextFirst
        ? cleanedSharedText
        : imported?.text ||
          imported?.sourceImportedText ||
          imported?.description ||
          cleanedSharedText ||
          sharedText,
      2200
    );

    if (!sourceText) {
      return jsonResponse({
        ok: false,
        error: "Could not read text from the shared post.",
        sourcePost: {
          platform:
          url,
          authorName: imported?.authorName || imported?.sourceAuthorName || null,
          authorHandle: imported?.authorHandle || imported?.sourceAuthorHandle || null,
        },
      }, 422);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
      { role: 'system', content: RAZOR_EDGE_REWRITE_SYSTEM_PROMPT },
        {
          role: "system",
          content:
            "You generate concise, same-speaker social-post rewrites for FlipSide. You must return strict JSON only.",
        },
        { role: "user", content: buildPrompt(sourceText) },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
    const deck = normalizeDeck(parsed, sourceText);
    const deckId = makeDeckId();

    const payload = {
      ok: true,
      deckId,
      promptVersion: "razor_edge_examples_v1",
      model: MODEL,
      sourcePost: {
        platform,
        url: imported?.permalink || imported?.sourceUrl || url || null,
        authorName: imported?.authorName || imported?.sourceAuthorName || null,
        authorHandle: imported?.authorHandle || imported?.sourceAuthorHandle || null,
        text: sourceText,
        importMethod: useSharedTextFirst
          ? "ios_shared_text"
          : imported?.importMethod || (url ? "url_fallback" : "shared_text"),
      },
      deck,
    };

    try {
      await storeShareExtensionDeck(deckId, payload);
      return jsonResponse({ ...payload, stored: true });
    } catch (storageError: any) {
      console.error("[/api/share-extension/flip] storage failed", storageError);
      return jsonResponse({ ...payload, stored: false, storageError: storageError?.message || "storage_failed" });
    }
  } catch (err: any) {
    console.error("[/api/share-extension/flip] failed", err);
    return jsonResponse({ ok: false, error: err?.message || "Could not generate Flip Deck" }, 500);
  }
}
