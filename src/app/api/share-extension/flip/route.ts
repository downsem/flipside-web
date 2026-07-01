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

Allowed:
- blunt framing
- uncomfortable implications
- sharp incentive analysis
- culturally biting satire
- direct disagreement
- vivid emotional language
- mockery of ideas, institutions, incentives, hypocrisy, public behavior, and weak arguments
- strong value conflict
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
- the speaker's basic identity and intent
- factual boundaries

Do not preserve:
- the original emotional temperature
- the original framing
- the original politeness
- the original assumptions

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
Argue the strongest possible credible reverse position. No hedging. No "some may argue." No fake neutrality. Make it sound like the smartest, most confident opponent in the room. The reader should feel real friction.

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

Before returning, privately quality-check each lens:

1. Could someone identify this lens without seeing the label?
2. Does this feel like a share card, not a summary?
3. Is it close to the line while still factually defensible?
4. What is this card supposed to make the reader feel?
5. Is that feeling actually present in the language?
6. Does this expose a real tension in the issue?
7. Would this make someone pause, laugh, feel challenged, feel understood, or want to share?

If any answer is no, rewrite sharper before returning.

Return JSON in this exact shape:

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
    const sourceText = cleanText(
      imported?.text || imported?.sourceImportedText || imported?.description || sharedText,
      2200
    );

    if (!sourceText) {
      return jsonResponse({
        ok: false,
        error: "Could not read text from the shared post.",
        sourcePost: {
          platform: imported?.platform || imported?.sourcePlatform || detectPlatform(url),
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
      promptVersion: "razor_edge_rewrite_v1",
      model: MODEL,
      sourcePost: {
        platform: imported?.platform || imported?.sourcePlatform || detectPlatform(url),
        url: imported?.permalink || imported?.sourceUrl || url || null,
        authorName: imported?.authorName || imported?.sourceAuthorName || null,
        authorHandle: imported?.authorHandle || imported?.sourceAuthorHandle || null,
        text: sourceText,
        importMethod: imported?.importMethod || (url ? "url_fallback" : "shared_text"),
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
