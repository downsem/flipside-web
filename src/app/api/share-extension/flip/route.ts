import OpenAI from "openai";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

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
      promptVersion: "share_extension_flip_v1",
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
