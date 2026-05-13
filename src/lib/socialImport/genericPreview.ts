// src/lib/socialImport/genericPreview.ts
import type { ImportedSocialPost, ImportFailure } from "./types";
import { detectPlatform, normalizeUrl } from "./detect";

function cleanText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "";
}

function extractTitle(html: string) {
  return (
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
  );
}

function stripHtml(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function chooseBestText(html: string) {
  const title = extractTitle(html);
  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description");

  const candidates = [description, title].map(cleanText).filter(Boolean);
  const best = candidates.find((candidate) => candidate.length >= 25) || candidates[0] || "";

  if (!best || best.length < 20) {
    const bodyText = stripHtml(html);
    if (bodyText.length > best.length) return bodyText.slice(0, 900).trim();
  }

  return best;
}

export async function importGenericPreview(rawUrl: string): Promise<ImportedSocialPost | ImportFailure> {
  const sourceUrl = normalizeUrl(rawUrl);

  if (!sourceUrl) {
    return { ok: false, error: "Missing URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { ok: false, error: "Enter a valid public URL.", sourceUrl };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      ok: false,
      sourceUrl,
      sourcePlatform: detectPlatform(sourceUrl),
      error: "Only public http/https URLs are supported.",
    };
  }

  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FlipSideBot/1.0; +https://flipside-web.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        sourceUrl,
        sourcePlatform: detectPlatform(sourceUrl),
        error: `Could not import this URL (${response.status}).`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return {
        ok: false,
        sourceUrl,
        sourcePlatform: detectPlatform(sourceUrl),
        error: "This URL does not look like a text post or article.",
      };
    }

    const title = extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description");
    const imageUrl =
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image") ||
      null;
    const text = chooseBestText(html);

    if (!text || text.length < 12) {
      return {
        ok: false,
        sourceUrl,
        sourcePlatform: detectPlatform(sourceUrl),
        title,
        description,
        error: "Could not pull readable post text from this URL.",
      };
    }

    return {
      ok: true,
      platform: detectPlatform(sourceUrl),
      sourcePlatform: detectPlatform(sourceUrl),
      sourceUrl,
      permalink: sourceUrl,
      postId: null,
      uri: null,
      cid: null,
      authorName: null,
      authorHandle: null,
      sourceAuthorName: null,
      sourceAuthorHandle: null,
      timestamp: null,
      sourceTimestampLabel: null,
      text,
      title,
      description,
      imageUrl,
      embedUrl: sourceUrl,
      importMethod: "generic_preview",
      ownershipMode: "external_public_post",
    };
  } catch (err: any) {
    return {
      ok: false,
      sourceUrl,
      sourcePlatform: detectPlatform(sourceUrl),
      error: err?.message || "Could not import this URL.",
    };
  }
}
