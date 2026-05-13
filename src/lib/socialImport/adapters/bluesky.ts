// src/lib/socialImport/adapters/bluesky.ts
import type { ImportedSocialPost, ImportFailure } from "../types";
import { normalizeUrl } from "../detect";

const BSKY_PUBLIC_API = "https://public.api.bsky.app";

type ParsedBlueskyUrl = {
  sourceUrl: string;
  actor: string;
  rkey: string;
};

function parseBlueskyPostUrl(rawUrl: string): ParsedBlueskyUrl | null {
  const sourceUrl = normalizeUrl(rawUrl);

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();

    if (host !== "bsky.app" && !host.endsWith(".bsky.app")) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const profileIndex = parts.findIndex((part) => part === "profile");
    const postIndex = parts.findIndex((part) => part === "post");

    if (profileIndex === -1 || postIndex === -1) return null;

    const actor = parts[profileIndex + 1];
    const rkey = parts[postIndex + 1];

    if (!actor || !rkey) return null;

    return {
      sourceUrl,
      actor: decodeURIComponent(actor),
      rkey: decodeURIComponent(rkey),
    };
  } catch {
    return null;
  }
}

async function resolveActorToDid(actor: string) {
  if (actor.startsWith("did:")) return actor;

  const url =
    `${BSKY_PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=` +
    encodeURIComponent(actor);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not resolve Bluesky handle (${response.status}).`);
  }

  const json = await response.json();

  if (!json?.did) {
    throw new Error("Bluesky handle did not resolve to a DID.");
  }

  return json.did as string;
}

function firstImageFromEmbed(embed: any): string | null {
  if (!embed) return null;

  if (Array.isArray(embed.images) && embed.images[0]) {
    return embed.images[0].thumb || embed.images[0].fullsize || null;
  }

  if (embed.thumbnail) return embed.thumbnail;
  if (embed.external?.thumb) return embed.external.thumb;

  if (embed.record?.embeds?.length) {
    for (const nested of embed.record.embeds) {
      const nestedImage = firstImageFromEmbed(nested);
      if (nestedImage) return nestedImage;
    }
  }

  return null;
}

function externalUrlFromEmbed(embed: any): string | null {
  if (!embed) return null;
  if (embed.external?.uri) return embed.external.uri;
  if (embed.record?.uri) return embed.record.uri;
  return null;
}

function externalTitleFromEmbed(embed: any): string | null {
  if (!embed) return null;
  return embed.external?.title || null;
}

function externalDescriptionFromEmbed(embed: any): string | null {
  if (!embed) return null;
  return embed.external?.description || null;
}

export async function importBlueskyPost(rawUrl: string): Promise<ImportedSocialPost | ImportFailure> {
  const parsed = parseBlueskyPostUrl(rawUrl);

  if (!parsed) {
    return {
      ok: false,
      sourceUrl: normalizeUrl(rawUrl),
      sourcePlatform: "bluesky",
      error: "This does not look like a Bluesky post URL.",
    };
  }

  try {
    const did = await resolveActorToDid(parsed.actor);
    const uri = `at://${did}/app.bsky.feed.post/${parsed.rkey}`;
    const postsUrl =
      `${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.getPosts?uris=` +
      encodeURIComponent(uri);

    const response = await fetch(postsUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not fetch Bluesky post (${response.status}).`);
    }

    const json = await response.json();
    const post = Array.isArray(json?.posts) ? json.posts[0] : null;

    if (!post) {
      throw new Error("Bluesky post not found.");
    }

    const record = post.record || {};
    const author = post.author || {};
    const text = String(record.text || "").trim();

    if (!text) {
      throw new Error("Bluesky post has no readable text.");
    }

    const authorHandle = author.handle ? `@${String(author.handle).replace(/^@/, "")}` : null;
    const authorName = author.displayName || author.handle || null;
    const canonicalUrl = `https://bsky.app/profile/${author.handle || parsed.actor}/post/${parsed.rkey}`;
    const createdAt = record.createdAt || post.indexedAt || null;
    const imageUrl = firstImageFromEmbed(post.embed);
    const embedUrl = externalUrlFromEmbed(post.embed);

    return {
      ok: true,
      platform: "bluesky",
      sourcePlatform: "bluesky",
      sourceUrl: parsed.sourceUrl,
      permalink: canonicalUrl,
      postId: parsed.rkey,
      uri: post.uri || uri,
      cid: post.cid || null,
      authorName,
      authorHandle,
      sourceAuthorName: authorName,
      sourceAuthorHandle: authorHandle,
      timestamp: createdAt,
      sourceTimestampLabel: createdAt,
      text,
      title: externalTitleFromEmbed(post.embed) || null,
      description: externalDescriptionFromEmbed(post.embed) || null,
      imageUrl,
      embedUrl,
      importMethod: "bluesky_api",
      ownershipMode: "external_public_post",
    };
  } catch (err: any) {
    return {
      ok: false,
      sourceUrl: parsed.sourceUrl,
      sourcePlatform: "bluesky",
      error: err?.message || "Could not import Bluesky post.",
    };
  }
}
