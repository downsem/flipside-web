// src/app/api/import-url/route.ts
import { NextResponse } from "next/server";

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

function detectPlatform(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("threads.net")) return "threads";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("reddit.com") || host.includes("redd.it")) return "reddit";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    return "web";
  } catch {
    return "web";
  }
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = normalizeUrl(typeof body?.url === "string" ? body.url : "");

    if (!sourceUrl) {
      return NextResponse.json({ ok: false, error: "Missing URL." }, { status: 200 });
    }

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return NextResponse.json({ ok: false, error: "Enter a valid public URL." }, { status: 200 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { ok: false, error: "Only public http/https URLs are supported." },
        { status: 200 }
      );
    }

    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FlipSideBot/1.0; +https://flipside-web.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          sourceUrl,
          sourcePlatform: detectPlatform(sourceUrl),
          error: `Could not import this URL (${response.status}).`,
        },
        { status: 200 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return NextResponse.json(
        {
          ok: false,
          sourceUrl,
          sourcePlatform: detectPlatform(sourceUrl),
          error: "This URL does not look like a text post or article.",
        },
        { status: 200 }
      );
    }

    const title = extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description");
    const text = chooseBestText(html);

    if (!text || text.length < 12) {
      return NextResponse.json(
        {
          ok: false,
          sourceUrl,
          sourcePlatform: detectPlatform(sourceUrl),
          title,
          description,
          error: "Could not pull readable post text from this URL.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        sourceUrl,
        sourcePlatform: detectPlatform(sourceUrl),
        title,
        description,
        text,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/import-url] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not import this URL." },
      { status: 200 }
    );
  }
}
