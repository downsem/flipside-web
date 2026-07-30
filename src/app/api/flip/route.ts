// src/app/api/flip/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminAuth, getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";
import {
  DEFAULT_REWRITE_MODEL,
  REWRITE_LENS_IDS,
  REWRITE_PROMPT_VERSION,
  REWRITE_SELECTOR_VERSION,
  CANDIDATES_PER_LENS,
  type RewriteLensId,
} from "@/lib/flipRewriteContract";
import {
  cleanRewriteText,
  generateFlipRewrites,
  type RewriteCandidate,
} from "@/lib/flipRewriteEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_FLIP_MODEL || DEFAULT_REWRITE_MODEL;

type ImportedLockedLens = {
  lensId?: RewriteLensId;
  timelineId?: RewriteLensId;
  text?: string;
  sourceType?: "imported" | "native_user";
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  sourceAuthorName?: string | null;
  sourceAuthorHandle?: string | null;
  importedByUid?: string | null;
};

type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "SERVER_CONFIGURATION"
  | "INTERNAL_ERROR";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return jsonResponse(
    {
      ok: false,
      error: { code, message },
      ...extra,
    },
    status
  );
}

function normalizeFatalError(err: unknown) {
  const value = err as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
  };
  const status = Number(value?.status || 0);
  const code = String(value?.code || value?.type || "").toLowerCase();

  if (status === 429 || code.includes("rate_limit") || code.includes("insufficient_quota")) {
    return {
      code: "RATE_LIMITED" as const,
      message: "FlipSide is temporarily at capacity. Please try again shortly.",
      status: 429,
    };
  }

  if (status >= 500 || code.includes("timeout") || code.includes("connection")) {
    return {
      code: "SERVICE_UNAVAILABLE" as const,
      message: "Perspective generation is temporarily unavailable. Please try again.",
      status: 503,
    };
  }

  return {
    code: "INTERNAL_ERROR" as const,
    message: "The perspectives could not be generated. Please try again.",
    status: 500,
  };
}

function detectPlatform(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("threads.net") || host.includes("threads.com")) return "threads";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    if (host.includes("reddit.com")) return "reddit";
    return "other";
  } catch {
    return "other";
  }
}

function extractBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeLockedLenses(
  raw: unknown
): Partial<Record<RewriteLensId, ImportedLockedLens>> {
  const out: Partial<Record<RewriteLensId, ImportedLockedLens>> = {};
  if (!raw || typeof raw !== "object") return out;

  const entries = Array.isArray(raw)
    ? raw.map((item) => [item?.lensId ?? item?.timelineId, item] as const)
    : Object.entries(raw as Record<string, unknown>);

  for (const [key, value] of entries) {
    const item = value as ImportedLockedLens;
    const lensId = String(item?.lensId ?? item?.timelineId ?? key) as RewriteLensId;
    if (!REWRITE_LENS_IDS.includes(lensId)) continue;

    const importedText = cleanRewriteText(item?.text, 12000);
    if (!importedText) continue;

    out[lensId] = {
      ...item,
      lensId,
      timelineId: lensId,
      text: importedText,
      sourceType: item?.sourceType === "native_user" ? "native_user" : "imported",
      sourcePlatform: item?.sourcePlatform ?? detectPlatform(item?.sourceUrl),
      sourceUrl: item?.sourceUrl ?? null,
      sourceAuthorName: item?.sourceAuthorName ?? null,
      sourceAuthorHandle: item?.sourceAuthorHandle ?? null,
      importedByUid: item?.importedByUid ?? null,
    };
  }

  return out;
}

async function verifyRequestUser(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    console.warn("[/api/flip] Invalid Firebase ID token", err);
    return null;
  }
}

async function persistCandidates(
  runRef: any,
  candidates: RewriteCandidate[],
  model: string
) {
  await Promise.all(
    candidates.map((candidate) =>
      runRef.collection("candidates").doc(candidate.id).set({
        ...candidate,
        promptVersion: REWRITE_PROMPT_VERSION,
        judgeVersion: REWRITE_SELECTOR_VERSION,
        judgeMode: "batched",
        model,
        createdAt: adminFieldValue.serverTimestamp(),
      })
    )
  );
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const postId = typeof body?.postId === "string" ? body.postId : undefined;
    const text = cleanRewriteText(body?.text, 12000);

    if (!postId || !text) {
      return errorResponse("BAD_REQUEST", "A post and text are required.", 400, { details: [] });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return errorResponse(
        "SERVER_CONFIGURATION",
        "FlipSide is not configured to generate perspectives.",
        500,
        { details: [] }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse(
        "SERVER_CONFIGURATION",
        "FlipSide is not configured to generate perspectives.",
        500,
        { details: [] }
      );
    }

    const decoded = await verifyRequestUser(req);
    if (!decoded?.uid) {
      return errorResponse("UNAUTHORIZED", "Please sign in again and retry.", 401, { details: [] });
    }

    const adminDb = getAdminDb();
    const postRef = adminDb.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return errorResponse("NOT_FOUND", "That post could not be found.", 404, { details: [] });
    }

    const post = postSnap.data() || {};
    if (post.authorId && post.authorId !== decoded.uid) {
      return errorResponse(
        "FORBIDDEN",
        "You can only generate perspectives for your own posts.",
        403,
        { details: [] }
      );
    }

    const lockedLenses = normalizeLockedLenses(body?.lockedLenses ?? body?.importedLenses);
    const aiLensIds = REWRITE_LENS_IDS.filter((lensId) => !lockedLenses[lensId]);
    const runRef = postRef.collection("generationRuns").doc();

    await runRef.set({
      id: runRef.id,
      postId,
      userId: decoded.uid,
      promptVersion: REWRITE_PROMPT_VERSION,
      judgeVersion: REWRITE_SELECTOR_VERSION,
      model: MODEL,
      candidatesPerLens: CANDIDATES_PER_LENS,
      judgeMode: "batched",
      status: "running",
      startedAt: adminFieldValue.serverTimestamp(),
    });

    const lockedResults = await Promise.all(
      Object.entries(lockedLenses).map(async ([lensId, locked]) => {
        const timelineId = lensId as RewriteLensId;
        await postRef.collection("rewrites").doc(timelineId).set(
          {
            timelineId,
            lensId: timelineId,
            text: locked?.text ?? "",
            sourceType: locked?.sourceType ?? "imported",
            sourcePlatform: locked?.sourcePlatform ?? detectPlatform(locked?.sourceUrl),
            sourceUrl: locked?.sourceUrl ?? null,
            sourceAuthorName: locked?.sourceAuthorName ?? null,
            sourceAuthorHandle: locked?.sourceAuthorHandle ?? null,
            importedByUid: locked?.importedByUid ?? null,
            generationRunId: runRef.id,
            locked: true,
            updatedAt: adminFieldValue.serverTimestamp(),
            createdAt: adminFieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          timelineId,
          ok: true,
          sourceType: locked?.sourceType ?? "imported",
          locked: true,
        };
      })
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const engineResult = aiLensIds.length
      ? await generateFlipRewrites(openai, {
          originalText: text,
          lensIds: aiLensIds,
          model: MODEL,
          allowPartial: true,
        })
      : {
          model: MODEL,
          observedModels: [MODEL],
          modelCalls: [],
          promptVersion: REWRITE_PROMPT_VERSION,
          promptFingerprint: null,
          selectorVersion: REWRITE_SELECTOR_VERSION,
          selectorFingerprint: null,
          rewrites: {},
          candidatesByLens: {},
          errorsByLens: {},
          usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, calls: 0 },
          latencyMs: 0,
        };

    const aiResults = await Promise.all(
      aiLensIds.map(async (timelineId) => {
        const selectedText = engineResult.rewrites[timelineId];
        const candidates = engineResult.candidatesByLens[timelineId] || [];
        const error = engineResult.errorsByLens[timelineId];

        if (!selectedText || error) {
          await postRef.collection("rewrites").doc(timelineId).set(
            {
              timelineId,
              lensId: timelineId,
              text: "(We couldn't generate this rewrite right now.)",
              sourceType: "ai",
              generationMode: "ranked_candidates",
              locked: false,
              error: error || "Candidate generation failed",
              generationRunId: runRef.id,
              promptVersion: REWRITE_PROMPT_VERSION,
              judgeVersion: REWRITE_SELECTOR_VERSION,
              model: MODEL,
              updatedAt: adminFieldValue.serverTimestamp(),
              createdAt: adminFieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          return {
            timelineId,
            ok: false,
            sourceType: "ai",
            locked: false,
            error: error || "Candidate generation failed",
          };
        }

        await persistCandidates(runRef, candidates, MODEL);
        const selected = candidates.find((candidate) => candidate.selected) || candidates[0];

        await postRef.collection("rewrites").doc(timelineId).set(
          {
            timelineId,
            lensId: timelineId,
            text: selectedText,
            sourceType: "ai",
            generationMode: "ranked_candidates",
            searchGrounded: false,
            generationRunId: runRef.id,
            promptVersion: REWRITE_PROMPT_VERSION,
            judgeVersion: REWRITE_SELECTOR_VERSION,
            judgeMode: "batched",
            model: MODEL,
            candidateId: selected?.id || null,
            candidateScore: selected?.score || null,
            candidateReason: selected?.reason || null,
            locked: false,
            updatedAt: adminFieldValue.serverTimestamp(),
            createdAt: adminFieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          timelineId,
          ok: true,
          sourceType: "ai",
          locked: false,
          selectedCandidateId: selected?.id || null,
          selectedScore: selected?.score || null,
        };
      })
    );

    const results = [...lockedResults, ...aiResults];
    const hadErrors = results.some((result) => !result.ok);
    const latencyMs = Date.now() - startedAt;

    await runRef.set(
      {
        status: hadErrors ? "partial_failure" : "completed",
        completedAt: adminFieldValue.serverTimestamp(),
        latencyMs,
        engineLatencyMs: engineResult.latencyMs,
        usage: engineResult.usage,
        requestedModel: MODEL,
        observedModels: engineResult.observedModels,
        modelCalls: engineResult.modelCalls,
        promptFingerprint: engineResult.promptFingerprint,
        selectorFingerprint: engineResult.selectorFingerprint,
        results,
      },
      { merge: true }
    );

    await postRef.set(
      {
        hasImportedLenses: Object.keys(lockedLenses).length > 0,
        importedLensCount: Object.keys(lockedLenses).length,
        lastAiGenerationMode: "ranked_candidates",
        lastGenerationRunId: runRef.id,
        promptVersion: REWRITE_PROMPT_VERSION,
        updatedAt: adminFieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return jsonResponse({
      ok: true,
      partialFailure: hadErrors,
      details: results,
      generationMode: "ranked_candidates",
      promptVersion: REWRITE_PROMPT_VERSION,
      judgeVersion: REWRITE_SELECTOR_VERSION,
      generationRunId: runRef.id,
      model: MODEL,
      requestedModel: MODEL,
      observedModels: engineResult.observedModels,
      modelCalls: engineResult.modelCalls,
      promptFingerprint: engineResult.promptFingerprint,
      selectorFingerprint: engineResult.selectorFingerprint,
      usage: engineResult.usage,
      latencyMs,
    });
  } catch (err: unknown) {
    console.error("[/api/flip] Fatal error:", err);
    const normalized = normalizeFatalError(err);
    return errorResponse(normalized.code, normalized.message, normalized.status, {
      partialFailure: true,
      details: [],
    });
  }
}
