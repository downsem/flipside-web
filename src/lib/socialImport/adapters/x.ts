// src/lib/socialImport/adapters/x.ts
import type { ImportedSocialPost, ImportFailure } from "../types";
import { normalizeUrl } from "../detect";

const X_API_BASE = "https://api.x.com/2";

type ParsedXUrl = {
  sourceUrl: string;
  handle?: string | null;
  postId: string;
};

function parseXPostUrl(rawUrl: string): ParsedXUrl | null {
  const sourceUrl = normalizeUrl(rawUrl);

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();

    const isX =
      host === "x.com" ||
      host === "www.x.com" ||
      host === "twitter.com" ||
      host === "www.twitter.com" ||
      host === "mobile.twitter.com";

    if (!isX) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const statusIndex = parts.findIndex((part) => part === "status" || part === "statuses");

    if (statusIndex !== -1 && parts[statusIndex + 1]) {
      return {
        sourceUrl,
        handle: parts[statusIndex - 1] || null,
        postId: parts[statusIndex + 1],
      };
    }

    const webStatusIndex = parts.findIndex((part, idx) => part === "status" && parts[idx - 1] === "web");
    if (webStatusIndex !== -1 && parts[webStatusIndex + 1]) {
      return {
        sourceUrl,
        handle: null,
        postId: parts[webStatusIndex + 1],
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getBestText(post: any) {
  const noteText = post?.note_tweet?.text;
  if (typeof noteText === "string" && noteText.trim()) return noteText.trim();

  const text = post?.text;
  if (typeof text === "string") return text.trim();

  return "";
}

function getAuthor(includes: any, authorId?: string | null) {
  const users = Array.isArray(includes?.users) ? includes.users : [];
  if (!authorId) return users[0] || null;
  return users.find((user: any) => String(user.id) === String(authorId)) || users[0] || null;
}

function getFirstImage(includes: any) {
  const media = Array.isArray(includes?.media) ? includes.media : [];
  const photo = media.find((item: any) => item?.type === "photo" && item?.url);
  if (photo?.url) return photo.url;

  const preview = media.find((item: any) => item?.preview_image_url);
  if (preview?.preview_image_url) return preview.preview_image_url;

  return null;
}

function getPublicMetrics(post: any) {
  const metrics = post?.public_metrics || null;
  if (!metrics) return null;

  return {
    retweetCount: metrics.retweet_count ?? null,
    replyCount: metrics.reply_count ?? null,
    likeCount: metrics.like_count ?? null,
    quoteCount: metrics.quote_count ?? null,
    bookmarkCount: metrics.bookmark_count ?? null,
    impressionCount: metrics.impression_count ?? null,
  };
}

export async function importXPost(rawUrl: string): Promise<ImportedSocialPost | ImportFailure> {
  const parsed = parseXPostUrl(rawUrl);

  if (!parsed) {
    return {
      ok: false,
      sourceUrl: normalizeUrl(rawUrl),
      sourcePlatform: "x",
      error: "This does not look like an X post URL.",
    };
  }

  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    return {
      ok: false,
      sourceUrl: parsed.sourceUrl,
      sourcePlatform: "x",
      error: "Missing X_BEARER_TOKEN in the web backend environment.",
    };
  }

  try {
    const params = new URLSearchParams({
      "tweet.fields": [
        "id",
        "text",
        "author_id",
        "created_at",
        "attachments",
        "entities",
        "public_metrics",
        "referenced_tweets",
        "note_tweet",
        "possibly_sensitive",
        "lang",
        "edit_history_tweet_ids",
      ].join(","),
      expansions: ["author_id", "attachments.media_keys"].join(","),
      "user.fields": ["id", "name", "username", "profile_image_url", "verified"].join(","),
      "media.fields": ["media_key", "type", "url", "preview_image_url", "alt_text"].join(","),
    });

    const url = `${X_API_BASE}/tweets/${encodeURIComponent(parsed.postId)}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        json?.detail ||
        json?.title ||
        json?.errors?.[0]?.message ||
        `X API request failed (${response.status}).`;

      return {
        ok: false,
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: "x",
        error: detail,
      };
    }

    const post = json?.data;

    if (!post) {
      return {
        ok: false,
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: "x",
        error: "X post not found.",
      };
    }

    const text = getBestText(post);

    if (!text) {
      return {
        ok: false,
        sourceUrl: parsed.sourceUrl,
        sourcePlatform: "x",
        error: "X post has no readable text.",
      };
    }

    const author = getAuthor(json?.includes, post.author_id);
    const username = author?.username || parsed.handle || null;
    const authorHandle = username ? `@${String(username).replace(/^@/, "")}` : null;
    const authorName = author?.name || username || null;
    const permalink = username ? `https://x.com/${username}/status/${parsed.postId}` : parsed.sourceUrl;
    const imageUrl = getFirstImage(json?.includes);
    const timestamp = post.created_at || null;

    return {
      ok: true,
      platform: "x",
      sourcePlatform: "x",
      sourceUrl: parsed.sourceUrl,
      permalink,
      postId: parsed.postId,
      uri: null,
      cid: null,
      authorName,
      authorHandle,
      sourceAuthorName: authorName,
      sourceAuthorHandle: authorHandle,
      timestamp,
      sourceTimestampLabel: timestamp,
      text,
      title: null,
      description: null,
      imageUrl,
      embedUrl: permalink,
      importMethod: "x_api",
      ownershipMode: "external_public_post",
      publicMetrics: getPublicMetrics(post),
      possiblySensitive: post.possibly_sensitive ?? null,
      lang: post.lang || null,
    } as ImportedSocialPost & Record<string, unknown>;
  } catch (err: any) {
    return {
      ok: false,
      sourceUrl: parsed.sourceUrl,
      sourcePlatform: "x",
      error: err?.message || "Could not import X post.",
    };
  }
}
