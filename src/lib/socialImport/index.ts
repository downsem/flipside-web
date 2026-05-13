// src/lib/socialImport/index.ts
import type { ImportedSocialPost, ImportFailure } from "./types";
import { detectPlatform, normalizeUrl } from "./detect";
import { importBlueskyPost } from "./adapters/bluesky";
import { importGenericPreview } from "./genericPreview";

export async function importSocialPostFromUrl(rawUrl: string): Promise<ImportedSocialPost | ImportFailure> {
  const sourceUrl = normalizeUrl(rawUrl);
  const platform = detectPlatform(sourceUrl);

  if (platform === "bluesky") {
    return importBlueskyPost(sourceUrl);
  }

  return importGenericPreview(sourceUrl);
}

export { detectPlatform, normalizeUrl };
export type { ImportedSocialPost, ImportFailure };
