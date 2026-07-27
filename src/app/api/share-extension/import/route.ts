import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const COLLECTION = "shareExtensionDecks";
const LENS_IDS = ["opposite", "cynical", "playful", "bridge", "calm"] as const;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function cleanText(value: unknown, max = 2200) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

function safeDocId(value: unknown) {
  return String(value || "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 120);
}

function isValidDeckId(value: string) {
  return /^[A-Za-z0-9_-]{1,120}$/.test(value);
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function authenticatedUser(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.warn("[/api/share-extension/import] invalid Firebase token", error);
    return null;
  }
}

function detectPlatform(url: unknown) {
  try {
    const host = new URL(String(url || "")).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("threads.net") || host.includes("threads.com")) return "threads";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    if (host.includes("reddit.com")) return "reddit";
  } catch {}
  return "external";
}

export async function POST(req: Request) {
  try {
    const user = await authenticatedUser(req);
    if (!user?.uid) {
      return jsonResponse({ ok: false, error: "Please sign in again and retry." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const deckId = cleanText((body as any)?.deckId, 120);
    if (!isValidDeckId(deckId)) {
      return jsonResponse({ ok: false, error: "Missing or invalid deckId." }, 400);
    }

    const adminDb = getAdminDb();
    const stored = await adminDb.collection(COLLECTION).doc(deckId).get();
    if (!stored.exists) {
      return jsonResponse({ ok: false, error: "That Flip Deck is no longer available." }, 404);
    }

    const storedData = stored.data() || {};
    const payload = (storedData.payload || {}) as Record<string, any>;
    const deck = (payload.deck || {}) as Record<string, unknown>;
    const sourcePost = (payload.sourcePost || {}) as Record<string, unknown>;
    const originalText = cleanText(deck.original || sourcePost.text, 2200);
    if (!originalText) {
      return jsonResponse({ ok: false, error: "Stored Flip Deck is missing its Original." }, 422);
    }

    const missingLens = LENS_IDS.find((lensId) => !cleanText(deck[lensId], 1800));
    if (missingLens) {
      return jsonResponse({ ok: false, error: `Stored Flip Deck is missing the ${missingLens} lens.` }, 422);
    }

    const postId = `shareext_${safeDocId(deckId)}_${safeDocId(user.uid)}`;
    const postRef = adminDb.collection("posts").doc(postId);
    const existing = await postRef.get();
    if (existing.exists && existing.data()?.authorId !== user.uid) {
      return jsonResponse({ ok: false, error: "That imported Flip belongs to another account." }, 403);
    }

    const sourceUrl = cleanText(sourcePost.url, 1600) || null;
    const sourcePlatform = cleanText(sourcePost.platform, 80) || detectPlatform(sourceUrl);
    const authorIsAnonymous = user.firebase?.sign_in_provider === "anonymous";
    const authorDisplayName = authorIsAnonymous
      ? null
      : cleanText(user.name || user.email, 180) || "FlipSide user";

    const postData: Record<string, unknown> = {
      id: postId,
      text: originalText,
      authorId: user.uid,
      authorDisplayName,
      authorIsAnonymous,
      updatedAt: adminFieldValue.serverTimestamp(),
      sourceType: "share-extension",
      sourceUrl,
      sourcePlatform,
      sourceAuthorName: cleanText(sourcePost.authorName, 180) || null,
      sourceAuthorHandle: cleanText(sourcePost.authorHandle, 180) || null,
      sourceImportedText: originalText,
      sourceOnly: false,
      importMethod: cleanText(sourcePost.importMethod, 120) || "ios_share_extension",
      flipType: "ai",
      status: "published",
      hasImportedLenses: false,
      importedLensCount: 0,
      promptVersion: cleanText(payload.promptVersion, 120) || "share_extension_flip_v1",
      aiModel: cleanText(payload.model, 120) || null,
      shareExtensionDeckId: deckId,
      createdVia: "ios_share_extension",
    };

    if (!existing.exists) {
      postData.createdAt = adminFieldValue.serverTimestamp();
      postData.votes = 0;
      postData.replyCount = 0;
    }

    const batch = adminDb.batch();
    batch.set(postRef, postData, { merge: true });

    for (const lensId of LENS_IDS) {
      batch.set(
        postRef.collection("rewrites").doc(lensId),
        {
          id: lensId,
          lensId,
          timelineId: lensId,
          text: cleanText(deck[lensId], 1800),
          sourceType: "ai",
          promptVersion: postData.promptVersion,
          model: postData.aiModel,
          generatedVia: "ios_share_extension",
          createdAt: adminFieldValue.serverTimestamp(),
          updatedAt: adminFieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return jsonResponse({ ok: true, postId, deckId, imported: !existing.exists });
  } catch (error: any) {
    console.error("[/api/share-extension/import] failed", error);
    return jsonResponse({ ok: false, error: "Could not import this Flip Deck." }, 500);
  }
}
