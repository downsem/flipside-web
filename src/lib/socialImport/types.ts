// src/lib/socialImport/types.ts
export type ImportedSocialPost = {
  ok: true;
  platform: string;
  sourcePlatform: string;
  sourceUrl: string;
  permalink: string;
  postId?: string | null;
  uri?: string | null;
  cid?: string | null;
  authorName?: string | null;
  authorHandle?: string | null;
  sourceAuthorName?: string | null;
  sourceAuthorHandle?: string | null;
  timestamp?: string | null;
  sourceTimestampLabel?: string | null;
  text: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  embedUrl?: string | null;
  importMethod: "bluesky_api" | "generic_preview";
  ownershipMode: "external_public_post";
};

export type ImportFailure = {
  ok: false;
  sourceUrl?: string;
  sourcePlatform?: string;
  title?: string | null;
  description?: string | null;
  error: string;
};
