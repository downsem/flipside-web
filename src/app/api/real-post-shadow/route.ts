// src/app/api/real-post-shadow/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createHash } from "crypto";
import { getAdminAuth, getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

type LensId = "opposite" | "cynical" | "playful" | "bridge" | "calm";
type SourceName = "bluesky" | "x";

type SearchCandidate = {
  candidateId: string;
  source: SourceName;
  sourceId: string;
  sourceUrl: string | null;
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  createdAt: string | null;
  indexedAt: string | null;
  query: string;
};

const LENSES: LensId[] = ["opposite", "cynical", "playful", "bridge", "calm"];

const LENS_LABELS: Record<LensId, string> = {
  opposite: "Opposite",
  cynical: "Cynical",
  playful: "Satirical",
  bridge: "Bridge",
  calm: "Calm",
};

const MODEL = process.env.OPENAI_REAL_POST_MODEL || process.env.OPENAI_FLIP_MODEL || "gpt-4.1-mini";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function enabled(value: string | undefined, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function cleanText(value: unknown, max = 2400) {
  return String(value || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

function extractBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function extractJsonObject(value: string): any | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced);
    } catch {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function hashId(...parts: string[]) {
  return createHash("sha1").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 20);
}

function dedupeCandidates(candidates: SearchCandidate[]) {
  const seen = new Set<string>();
  const out: SearchCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.source}:${candidate.sourceId || candidate.sourceUrl || candidate.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }

  return out;
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function pickOriginalText(data: any, body: any) {
  return cleanText(
    body.originalText ||
      body.text ||
      data?.text ||
      data?.originalText ||
      data?.content ||
      data?.body ||
      data?.prompt ||
      data?.sourceText ||
      "",
    2400
  );
}

function bskyPostUrl(uri: string, handle: string | null) {
  const match = String(uri || "").match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
  const rkey = match?.[1];
  if (!rkey || !handle) return null;
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

async function requireUser(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

async function generateQueries(openai: OpenAI, originalText: string) {
  const fallback = cleanText(originalText, 180)
    .replace(/[^\w\s#@-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate short public-social search queries. Return JSON only. Do not include operators unless asked.",
      },
      {
        role: "user",
        content: [
          "Original post:",
          originalText,
          "",
          "Return JSON:",
          '{ "queries": ["query one", "query two", "query three"] }',
          "",
          "Rules:",
          "- 2 to 4 short queries.",
          "- Each query should be 3 to 8 words.",
          "- Focus on the concrete topic, claim, entities, and controversy axis.",
          "- Avoid generic words like politics, news, debate, opinion.",
        ].join("\n"),
      },
    ],
    temperature: 0.2,
  });

  const parsed = extractJsonObject(response.choices?.[0]?.message?.content || "");
  const queries = Array.isArray(parsed?.queries)
    ? parsed.queries.map((q: unknown) => cleanText(q, 120)).filter(Boolean)
    : [];

  return Array.from(new Set([fallback, ...queries].filter(Boolean))).slice(0, 4);
}

async function searchBluesky(query: string, limit: number): Promise<SearchCandidate[]> {
  const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "latest");
  url.searchParams.set("limit", String(Math.max(1, Math.min(25, limit))));

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Bluesky search failed: ${res.status}`);

  const json = await res.json();
  const posts = Array.isArray(json?.posts) ? json.posts : [];

  return posts
    .map((post: any): SearchCandidate | null => {
      const text = cleanText(post?.record?.text || "", 900);
      const handle = cleanText(post?.author?.handle || "", 120) || null;
      const uri = cleanText(post?.uri || "", 300);
      if (!text || !uri) return null;

      return {
        candidateId: `bsky_${hashId(uri, text)}`,
        source: "bluesky",
        sourceId: uri,
        sourceUrl: bskyPostUrl(uri, handle),
        text,
        authorName: cleanText(post?.author?.displayName || "", 120) || null,
        authorHandle: handle,
        createdAt: cleanText(post?.record?.createdAt || "", 80) || null,
        indexedAt: cleanText(post?.indexedAt || "", 80) || null,
        query,
      };
    })
    .filter(Boolean) as SearchCandidate[];
}

async function searchX(query: string, limit: number): Promise<SearchCandidate[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("Missing X_BEARER_TOKEN");

  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", `${query} lang:en -is:retweet`);
  url.searchParams.set("max_results", String(Math.max(10, Math.min(100, limit))));
  url.searchParams.set("tweet.fields", "created_at,author_id,lang,public_metrics");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`X search failed: ${res.status} ${body.slice(0, 180)}`);
  }

  const json = await res.json();
  const users = new Map<string, any>();
  for (const user of json?.includes?.users || []) {
    if (user?.id) users.set(String(user.id), user);
  }

  return (Array.isArray(json?.data) ? json.data : [])
    .map((tweet: any): SearchCandidate | null => {
      const text = cleanText(tweet?.text || "", 900);
      const id = cleanText(tweet?.id || "", 80);
      if (!text || !id) return null;

      const user = users.get(String(tweet?.author_id || ""));
      const username = cleanText(user?.username || "", 120) || null;

      return {
        candidateId: `x_${hashId(id, text)}`,
        source: "x",
        sourceId: id,
        sourceUrl: username ? `https://x.com/${username}/status/${id}` : `https://x.com/i/web/status/${id}`,
        text,
        authorName: cleanText(user?.name || "", 120) || null,
        authorHandle: username,
        createdAt: cleanText(tweet?.created_at || "", 80) || null,
        indexedAt: null,
        query,
      };
    })
    .filter(Boolean) as SearchCandidate[];
}

async function classifyCandidates(openai: OpenAI, originalText: string, candidates: SearchCandidate[]) {
  if (!candidates.length) {
    return {
      buckets: Object.fromEntries(LENSES.map((lens) => [lens, []])),
      rejected: [],
    };
  }

  const compactCandidates = candidates.slice(0, 60).map((candidate) => ({
    candidateId: candidate.candidateId,
    source: candidate.source,
    text: candidate.text,
    authorHandle: candidate.authorHandle,
    query: candidate.query,
  }));

  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You classify real public social posts into FlipSide lens buckets.",
          "Use only the candidate posts provided.",
          "Do not rewrite, invent, summarize, or fabricate posts.",
          "A weak match is worse than no match.",
          "Optimize for same-topic relevance, useful contrast, clarity, and lower-temperature discovery.",
          "Do not optimize for outrage.",
          "",
          "Lens definitions:",
          "Opposite: substantially disagrees with the original claim, priority, or conclusion.",
          "Cynical: questions motives, incentives, power, hypocrisy, feasibility, or hidden tradeoffs.",
          "Satirical: uses humor, irony, ridicule, absurdity, or meme-like framing.",
          "Bridge: recognizes competing concerns, proposes a middle path, or reframes around shared values.",
          "Calm: lowers temperature, adds context, clarifies facts, or states a measured version.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Original post:",
          originalText,
          "",
          "Candidates:",
          JSON.stringify(compactCandidates),
          "",
          "Return JSON only in this shape:",
          JSON.stringify({
            buckets: {
              opposite: [
                {
                  candidateId: "id",
                  confidence: 0.8,
                  relevanceScore: 0.8,
                  lensFitScore: 0.8,
                  toxicityRisk: 0.1,
                  reason: "short reason",
                },
              ],
              cynical: [],
              playful: [],
              bridge: [],
              calm: [],
            },
            rejected: [
              {
                candidateId: "id",
                reason: "off topic or weak fit",
              },
            ],
          }),
          "",
          "Rules:",
          "- Put each candidate in at most one bucket.",
          "- Return at most 8 candidates per bucket.",
          "- Use playful for the Satirical bucket key.",
          "- Reject off-topic, vague, spammy, or toxic candidates.",
          "- Preserve candidateId exactly.",
        ].join("\n"),
      },
    ],
    temperature: 0.1,
  });

  const parsed = extractJsonObject(response.choices?.[0]?.message?.content || "") || {};
  const buckets: Record<LensId, any[]> = {
    opposite: [],
    cynical: [],
    playful: [],
    bridge: [],
    calm: [],
  };

  const byId = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));

  for (const lens of LENSES) {
    const items = Array.isArray(parsed?.buckets?.[lens]) ? parsed.buckets[lens] : [];
    buckets[lens] = items
      .map((item: any) => {
        const candidate = byId.get(String(item?.candidateId || ""));
        if (!candidate) return null;
        return {
          ...candidate,
          lensId: lens,
          lensLabel: LENS_LABELS[lens],
          confidence: safeNumber(item?.confidence),
          relevanceScore: safeNumber(item?.relevanceScore),
          lensFitScore: safeNumber(item?.lensFitScore),
          toxicityRisk: safeNumber(item?.toxicityRisk),
          reason: cleanText(item?.reason || "", 280),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.confidence + b.relevanceScore + b.lensFitScore - (a.confidence + a.relevanceScore + a.lensFitScore))
      .slice(0, 8);
  }

  return {
    buckets,
    rejected: Array.isArray(parsed?.rejected) ? parsed.rejected.slice(0, 80) : [],
  };
}

export async function POST(req: Request) {
  try {
    if (!enabled(process.env.REAL_POST_SHADOW_ENABLED, true)) {
      return jsonResponse({ ok: true, skipped: true, reason: "REAL_POST_SHADOW_ENABLED is false" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ ok: false, error: "Missing OPENAI_API_KEY" }, 500);
    }

    const user = await requireUser(req);
    if (!user?.uid) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const postId = cleanText(body?.postId || "", 160) || null;
    const adminDb = getAdminDb();

    let postData: any = null;
    if (postId) {
      const snap = await adminDb.collection("posts").doc(postId).get();
      if (snap.exists) {
        postData = snap.data();
        const ownerUid = postData?.uid || postData?.userId || postData?.authorId || postData?.authorUid || postData?.createdByUid;
        if (ownerUid && ownerUid !== user.uid) {
          return jsonResponse({ ok: false, error: "Forbidden" }, 403);
        }
      }
    }

    const originalText = pickOriginalText(postData, body);
    if (!originalText || originalText.length < 8) {
      return jsonResponse({ ok: false, error: "Missing original post text" }, 400);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const queries = await generateQueries(openai, originalText);

    const bskyLimit = Math.max(1, Math.min(25, Number(process.env.BLUESKY_MAX_RESULTS_PER_QUERY || 12)));
    const xLimit = Math.max(10, Math.min(100, Number(process.env.X_MAX_RESULTS_PER_QUERY || 10)));

    const sourceErrors: Record<string, string[]> = {};
    const allCandidates: SearchCandidate[] = [];

    for (const query of queries) {
      try {
        allCandidates.push(...(await searchBluesky(query, bskyLimit)));
      } catch (err: any) {
        sourceErrors.bluesky = [...(sourceErrors.bluesky || []), String(err?.message || err)];
      }

      if (enabled(process.env.X_REAL_POST_SEARCH_ENABLED, false)) {
        try {
          allCandidates.push(...(await searchX(query, xLimit)));
        } catch (err: any) {
          sourceErrors.x = [...(sourceErrors.x || []), String(err?.message || err)];
        }
      }
    }

    const candidates = dedupeCandidates(allCandidates).slice(0, 80);
    const classification = await classifyCandidates(openai, originalText, candidates);

    const runRef = adminDb.collection("realPostShadowRuns").doc();
    const run = {
      uid: user.uid,
      postId,
      createdAt: adminFieldValue.serverTimestamp(),
      version: "real_post_shadow_v1",
      model: MODEL,
      sources: {
        bluesky: true,
        x: enabled(process.env.X_REAL_POST_SEARCH_ENABLED, false),
      },
      sourceErrors,
      original: {
        text: originalText,
        sourceUrl: body?.sourceUrl || postData?.sourceUrl || null,
        sourcePlatform: body?.sourcePlatform || postData?.sourcePlatform || null,
      },
      queries,
      candidateCount: candidates.length,
      candidates,
      buckets: classification.buckets,
      rejected: classification.rejected,
    };

    await runRef.set(run);

    if (postId) {
      await adminDb.collection("posts").doc(postId).set(
        {
          realPostShadow: {
            lastRunId: runRef.id,
            lastRunAt: adminFieldValue.serverTimestamp(),
            candidateCount: candidates.length,
            sources: run.sources,
            sourceErrors,
          },
        },
        { merge: true }
      );
    }

    return jsonResponse({
      ok: true,
      runId: runRef.id,
      candidateCount: candidates.length,
      queries,
      bucketCounts: Object.fromEntries(
        LENSES.map((lens) => [lens, classification.buckets[lens]?.length || 0])
      ),
      sourceErrors,
    });
  } catch (err: any) {
    console.error("[real-post-shadow] failed", err);
    return jsonResponse({ ok: false, error: String(err?.message || err) }, 500);
  }
}
