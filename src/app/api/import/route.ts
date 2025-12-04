import { NextRequest, NextResponse } from "next/server";

type Platform =
  | "x"
  | "threads"
  | "bluesky"
  | "truth"
  | "reddit"
  | "unknown";

function detectPlatform(url: URL): Platform {
  const host = url.hostname.toLowerCase();

  if (host.includes("x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("threads.net")) return "threads";
  if (host.includes("bsky.app")) return "bluesky";
  if (host.includes("truthsocial.com")) return "truth";
  if (host.includes("reddit.com")) return "reddit";

  return "unknown";
}

function extractMeta(html: string, ...names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const match = html.match(re);
    if (match && match[1]) {
      return decodeHTMLEntities(match[1]);
    }
  }
  return null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) {
      return NextResponse.json(
        { ok: false, reason: "MISSING_URL" },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json(
        { ok: false, reason: "INVALID_URL" },
        { status: 400 }
      );
    }

    const platform = detectPlatform(parsed);

    // Try to fetch HTML for ANY public URL.
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FlipsideBot/1.0; +https://example.com)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          platform,
          reason: "FETCH_FAILED",
          statusCode: res.status,
        },
        { status: 200 }
      );
    }

    const html = await res.text();

    // Prefer description-like tags, fall back to title.
    const title =
      extractMeta(html, "og:title", "twitter:title", "title") ?? null;
    const description =
      extractMeta(
        html,
        "og:description",
        "twitter:description",
        "description"
      ) ?? null;

    const rawText = description || title;

    if (!rawText) {
      return NextResponse.json(
        { ok: false, platform, reason: "NO_TEXT_FOUND" },
        { status: 200 }
      );
    }

    // Return the raw text; client will build a short snippet + source.
    return NextResponse.json({
      ok: true,
      platform,
      title,
      description,
      text: rawText,
    });
  } catch (err) {
    console.error("Error in /api/import:", err);
    return NextResponse.json(
      { ok: false, reason: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
