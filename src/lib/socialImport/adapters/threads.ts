// src/lib/socialImport/adapters/threads.ts
import type { ImportedSocialPost, ImportFailure } from "../types";
import { normalizeUrl } from "../detect";

type ParsedThreadsUrl = {
  sourceUrl: string;
  authorHandle?: string | null;
  shortcode?: string | null;
};

function parseThreadsPostUrl(rawUrl: string): ParsedThreadsUrl | null {
  const sourceUrl = normalizeUrl(rawUrl);

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();

    const isThreads =
      host === "threads.com" ||
      host === "www.threads.com" ||
      host === "threads.net" ||
      host === "www.threads.net";

    if (!isThreads) return null;

    const parts = url.pathname.split("/").filter(Boolean);

    const postIndex = parts.findIndex((part) => part === "post");
    if (postIndex !== -1 && parts[postIndex + 1]) {
      const maybeHandle = parts[postIndex - 1] || null;
      return {
        sourceUrl,
        authorHandle: maybeHandle ? `@${decodeURIComponent(maybeHandle).replace(/^@/, "")}` : null,
        shortcode: decodeURIComponent(parts[postIndex + 1]),
      };
    }

    const tIndex = parts.findIndex((part) => part === "t");
    if (tIndex !== -1 && parts[tIndex + 1]) {
      return {
        sourceUrl,
        authorHandle: null,
        shortcode: decodeURIComponent(parts[tIndex + 1]),
      };
    }

    return {
      sourceUrl,
      authorHandle: null,
      shortcode: null,
    };
  } catch {
    return null;
  }
}

function cleanText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
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

function maybeJsonStringToText(raw: string) {
  return cleanText(raw)
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0026/g, "&");
}

function extractJsonLdText(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const script of scripts) {
    const body = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();

    try {
      const parsed = JSON.parse(body);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const text =
          item?.articleBody ||
          item?.text ||
          item?.description ||
          item?.headline ||
          null;

        if (typeof text === "string" && cleanText(text).length >= 12) {
          return cleanText(text);
        }
      }
    } catch {
      // ignore
    }
  }

  return "";
}

function extractFromEmbeddedJson(html: string) {
  const candidates: string[] = [];

  const regexes = [
    /"text"\s*:\s*"([^"]{12,1200})"/g,
    /"caption"\s*:\s*"([^"]{12,1200})"/g,
    /"description"\s*:\s*"([^"]{12,1200})"/g,
  ];

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(html))) {
      const candidate = maybeJsonStringToText(match[1]);
      if (
        candidate &&
        candidate.length >= 12 &&
        !candidate.includes("JavaScript") &&
        !candidate.includes("Log in") &&
        !candidate.includes("Sign up")
      ) {
        candidates.push(candidate);
      }
    }
  }

  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

function extractThreadsTextFromMeta(description: string, title: string) {
  const combined = cleanText(description || title);
  if (!combined) return "";

  const quoted = combined.match(/on Threads:\s*[“"]([\s\S]+?)[”"]\s*$/i);
  if (quoted?.[1]) return cleanText(quoted[1]);

  const afterThreads = combined.match(/on Threads:\s*([\s\S]+)$/i);
  if (afterThreads?.[1]) return cleanText(afterThreads[1].replace(/^["“]/, "").replace(/["”]$/, ""));

  const afterDash = combined.match(/-\s*[^-]*on Threads:\s*([\s\S]+)$/i);
  if (afterDash?.[1]) return cleanText(afterDash[1]);

  return combined;
}

function extractAuthorName(title: string, fallbackHandle?: string | null) {
  const cleanTitle = cleanText(title);
  if (!cleanTitle) return fallbackHandle || null;

  const byline = cleanTitle.match(/^(.+?)\s+\(@[^)]+\)\s+on Threads/i);
  if (byline?.[1]) return cleanText(byline[1]);

  const simple = cleanTitle.match(/^(.+?)\s+on Threads/i);
  if (simple?.[1]) return cleanText(simple[1]);

  return fallbackHandle || null;
}

export async function importThreadsPost(rawUrl: string): Promise<ImportedSocialPost | ImportFailure> {
  const parsed = parseThreadsPostUrl(rawUrl);

  if (!parsed) {
    return {
      ok: false,
      sourceUrl: normalizeUrl(rawUrl),
      sourcePlatform: "threads",
      error: "This does not look like a Threads post URL.",
    };
  }

  try {
    const response = await fetch(parsed.sourceUrl, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: "threads",
        error: `Could not import Threads URL (${response.status}).`,
      };
    }

    const html = await response.text();

    const title = extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description");
    const imageUrl =
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image") ||
      null;

    const text =
      [extractJsonLdText(html), extractFromEmbeddedJson(html), extractThreadsTextFromMeta(description, title), stripHtml(html)]
        .map(cleanText)
        .find((candidate) => candidate && candidate.length >= 12) || "";

    if (!text) {
      return {
        ok: false,
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: "threads",
        title,
        description,
        error: "Could not pull readable Threads post text from this URL.",
      };
    }

    const authorName = extractAuthorName(title, parsed.authorHandle);
    const authorHandle = parsed.authorHandle || null;

    return {
      ok: true,
      platform: "threads",
      sourcePlatform: "threads",
      sourceUrl: parsed.sourceUrl,
      permalink: parsed.sourceUrl,
      postId: parsed.shortcode || null,
      uri: null,
      cid: null,
      authorName,
      authorHandle,
      sourceAuthorName: authorName,
      sourceAuthorHandle: authorHandle,
      timestamp: null,
      sourceTimestampLabel: null,
      text,
      title,
      description,
      imageUrl,
      embedUrl: parsed.sourceUrl,
      importMethod: "threads_metadata",
      ownershipMode: "external_public_post",
    } as ImportedSocialPost & Record<string, unknown>;
  } catch (err: any) {
    return {
      ok: false,
      sourceUrl: parsed.sourceUrl,
      sourcePlatform: "threads",
      error: err?.message || "Could not import Threads post.",
    };
  }
}
