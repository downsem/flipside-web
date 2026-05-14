// src/lib/socialImport/detect.ts
export function normalizeUrl(input: string) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function detectPlatform(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (host === "bsky.app" || host.endsWith(".bsky.app")) return "bluesky";
    if (host.includes("threads.net") || host.includes("threads.com") || host.includes("threads.com")) return "threads";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("truthsocial.com")) return "truth";
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";

    return "web";
  } catch {
    return "web";
  }
}
