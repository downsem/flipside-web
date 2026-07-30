import OpenAI from "openai";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";
import {
  DEFAULT_REWRITE_MODEL,
  REWRITE_PROMPT_VERSION,
  REWRITE_SELECTOR_VERSION,
  assertCompleteRewriteSet,
} from "@/lib/flipRewriteContract";
import { cleanRewriteText, generateFlipRewrites } from "@/lib/flipRewriteEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL =
  process.env.OPENAI_SHARE_EXTENSION_MODEL ||
  process.env.OPENAI_FLIP_MODEL ||
  DEFAULT_REWRITE_MODEL;
const COLLECTION = "shareExtensionDecks";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function cleanText(value: unknown, max = 2200): string {
  return cleanRewriteText(value, max);
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

  let cleaned = raw
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\b(?:threads\.net|x\.com|twitter\.com|bsky\.app)\S*/gi, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .trim();

  const boilerplatePatterns = [
    /^shared\s+(?:a\s+)?post\s+from\s+threads\s*:?\s*/i,
    /^check\s+out\s+this\s+post\s+on\s+threads\s*:?\s*/i,
    /^view\s+on\s+threads\s*:?\s*/i,
  ];

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

async function storeShareExtensionDeck(deckId: string, payload: Record<string, unknown>) {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(deckId).set(
    {
      deckId,
      payload,
      createdAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
      source: "ios_share_extension",
    },
    { merge: true }
  );
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
    const sharedText = cleanText((body as any)?.sharedText, 2200);

    if (!url && !sharedText) {
      return jsonResponse({ ok: false, error: "Missing url or sharedText" }, 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ ok: false, error: "Missing OPENAI_API_KEY" }, 500);
    }

    const origin = new URL(req.url).origin;
    const imported = url ? await hydrateSource(origin, url, sharedText) : null;

    const platform = imported?.platform || imported?.sourcePlatform || detectPlatform(url);
    const cleanedSharedText = stripSharedUrlBoilerplate(sharedText);
    const useSharedTextFirst = platform === "threads" && hasMeaningfulSharedText(sharedText);

    const sourceText = cleanText(
      useSharedTextFirst
        ? cleanedSharedText
        : imported?.text ||
            imported?.sourceImportedText ||
            imported?.description ||
            cleanedSharedText ||
            sharedText,
      12000
    );

    if (!sourceText) {
      return jsonResponse(
        {
          ok: false,
          error: "Could not read text from the shared post.",
          sourcePost: {
            platform,
            url,
            authorName: imported?.authorName || imported?.sourceAuthorName || null,
            authorHandle: imported?.authorHandle || imported?.sourceAuthorHandle || null,
          },
        },
        422
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const engineResult = await generateFlipRewrites(openai, {
      originalText: sourceText,
      model: MODEL,
      allowPartial: false,
    });
    const rewrites = assertCompleteRewriteSet(engineResult.rewrites);
    const deckId = makeDeckId();

    const payload = {
      ok: true,
      deckId,
      promptVersion: REWRITE_PROMPT_VERSION,
      judgeVersion: REWRITE_SELECTOR_VERSION,
      generationMode: "ranked_candidates",
      model: MODEL,
      requestedModel: MODEL,
      observedModels: engineResult.observedModels,
      modelCalls: engineResult.modelCalls,
      promptFingerprint: engineResult.promptFingerprint,
      selectorFingerprint: engineResult.selectorFingerprint,
      usage: engineResult.usage,
      latencyMs: engineResult.latencyMs,
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
      deck: {
        original: sourceText,
        ...rewrites,
      },
    };

    try {
      await storeShareExtensionDeck(deckId, payload);
      return jsonResponse({ ...payload, stored: true });
    } catch (storageError: any) {
      console.error("[/api/share-extension/flip] storage failed", storageError);
      return jsonResponse({
        ...payload,
        stored: false,
        storageError: storageError?.message || "storage_failed",
      });
    }
  } catch (err: any) {
    console.error("[/api/share-extension/flip] failed", err);
    return jsonResponse({ ok: false, error: err?.message || "Could not generate Flip Deck" }, 500);
  }
}
