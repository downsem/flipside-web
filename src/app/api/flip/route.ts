// src/app/api/flip/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  GLOBAL_REWRITE_SYSTEM_PROMPT,
  TIMELINE_LIST,
  type TimelineId,
} from "@/theme/timelines";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

type ImportedLockedLens = {
  lensId?: TimelineId;
  timelineId?: TimelineId;
  text?: string;
  sourceType?: "imported" | "native_user";
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  sourceAuthorName?: string | null;
  sourceAuthorHandle?: string | null;
  importedByUid?: string | null;
};

const VALID_LENS_IDS = new Set<TimelineId>(["calm", "bridge", "cynical", "opposite", "playful"]);

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function detectPlatform(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("threads.net")) return "threads";
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


type SearchGroundingContext = {
  ok: boolean;
  topicTags: string[];
  originalClaim: string;
  originalTone: string;
  contextSummary: string;
  searchQueries: string[];
  lensAngles: Partial<Record<TimelineId, string>>;
  raw?: string;
};

function cleanString(value: any, max = 1200): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanStringArray(value: any, maxItems = 8, maxEach = 120): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, maxEach))
    .filter(Boolean)
    .slice(0, maxItems);
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

function responseText(response: any): string {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text.trim();

  const output = Array.isArray(response.output) ? response.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = part?.text || part?.content || part?.value;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n").trim();
}

function shouldUseSearchGrounding(body: any): boolean {
  const requestedMode = String(body?.generationMode || body?.aiGenerationMode || "").toLowerCase();
  if (["classic", "no_search", "no-search", "offline"].includes(requestedMode)) return false;

  const flag = String(process.env.FLIPSIDE_SEARCH_GROUNDED_AI ?? "true").toLowerCase();
  return !["0", "false", "off", "no"].includes(flag);
}

function normalizeGrounding(raw: any, fallbackRaw = ""): SearchGroundingContext {
  const lensAngles = raw?.lensAngles && typeof raw.lensAngles === "object" ? raw.lensAngles : {};

  return {
    ok: true,
    topicTags: cleanStringArray(raw?.topicTags, 8, 80),
    originalClaim: cleanString(raw?.originalClaim, 420),
    originalTone: cleanString(raw?.originalTone, 220),
    contextSummary: cleanString(raw?.contextSummary || fallbackRaw, 1800),
    searchQueries: cleanStringArray(raw?.searchQueries, 8, 140),
    lensAngles: {
      calm: cleanString(lensAngles.calm, 420),
      bridge: cleanString(lensAngles.bridge, 420),
      cynical: cleanString(lensAngles.cynical, 420),
      opposite: cleanString(lensAngles.opposite, 420),
      playful: cleanString(lensAngles.playful, 420),
    },
    raw: cleanString(fallbackRaw, 2400),
  };
}

async function buildSearchGroundingContext(openai: OpenAI, originalText: string): Promise<SearchGroundingContext | null> {
  const client: any = openai as any;
  if (!client?.responses?.create) {
    console.warn("[/api/flip] OpenAI Responses API unavailable; using classic rewrite mode.");
    return null;
  }

  const model = process.env.OPENAI_WEB_SEARCH_MODEL || process.env.OPENAI_SEARCH_MODEL || "gpt-4.1-mini";
  const searchContextSize = process.env.OPENAI_WEB_SEARCH_CONTEXT_SIZE || "low";

  try {
    const response = await client.responses.create({
      model,
      tools: [
        {
          type: "web_search",
          search_context_size: searchContextSize,
        },
      ],
      tool_choice: "auto",
      input: [
        {
          role: "system",
          content:
            "You help FlipSide write smarter AI-generated social-post rewrites. " +
            "Use web search only to understand current public context around the original post. " +
            "Do not find or create replacement social posts. Do not fabricate posts, authors, URLs, or quotes. " +
            "Return compact JSON only.",
        },
        {
          role: "user",
          content:
            "Original post:\n" +
            originalText +
            "\n\nAnalyze the topic and current public context. Return JSON with exactly these keys:\n" +
            "{\n" +
            '  "topicTags": ["short topic tag"],\n' +
            '  "originalClaim": "one sentence describing the claim or concern",\n' +
            '  "originalTone": "one phrase describing the tone",\n' +
            '  "searchQueries": ["queries you effectively searched or would search"],\n' +
            '  "contextSummary": "brief current-context summary useful for rewriting, not citations",\n' +
            '  "lensAngles": {\n' +
            '    "calm": "measured, clarifying angle",\n' +
            '    "bridge": "what different groups are reacting to",\n' +
            '    "cynical": "incentives, power, media, status, or attention angle",\n' +
            '    "opposite": "strongest credible counterargument",\n' +
            '    "playful": "funny social-native angle"\n' +
            "  }\n" +
            "}\n\n" +
            "Keep this compact. The generated lenses will remain labeled AI-generated, not imported/source cards.",
        },
      ],
    });

    const raw = responseText(response);
    const parsed = extractJsonObject(raw);
    if (!parsed) {
      return normalizeGrounding({ contextSummary: raw }, raw);
    }

    return normalizeGrounding(parsed, raw);
  } catch (err) {
    console.warn("[/api/flip] Search grounding failed; falling back to classic rewrite mode.", err);
    return null;
  }
}

function buildSearchGroundingGenerationPrompt(
  context: SearchGroundingContext | null,
  timelineId: TimelineId,
  timelineLabel: string
): string {
  if (!context?.ok) return "";

  const lensAngle = cleanString((context.lensAngles as any)?.[timelineId], 520);
  const topicTags = context.topicTags.length ? context.topicTags.join(", ") : "unknown";
  const queries = context.searchQueries.length ? context.searchQueries.join(" | ") : "not stored";

  return (
    "SEARCH-GROUNDED BACKGROUND CONTEXT:\n" +
    "Use this context to make the rewrite more informed, specific, and perspective-driven. " +
    "Do not mention that you searched. Do not cite sources. Do not claim this is a real imported post. " +
    "Do not invent source names, URLs, authors, or direct quotes. The card remains an AI-generated lens.\n\n" +
    `Topic tags: ${topicTags}\n` +
    `Original claim: ${context.originalClaim || "not extracted"}\n` +
    `Original tone: ${context.originalTone || "not extracted"}\n` +
    `Current context summary: ${context.contextSummary || "not available"}\n` +
    `Search query hints: ${queries}\n` +
    `Lens-specific angle for ${timelineLabel}: ${lensAngle || "Use the lens instructions to choose a grounded angle."}\n\n` +
    "QUALITY BAR:\n" +
    "- Do not merely paraphrase the original.\n" +
    "- Identify the real disagreement, assumption, incentive, or worldview underneath it.\n" +
    "- Calm should clarify without becoming vague or therapist-like.\n" +
    "- Bridge should translate why different people read the same issue differently without becoming neutral mush.\n" +
    "- Opposite should be the strongest credible counterargument, not a strawman.\n\n"
  );
}

function searchGroundingForFirestore(context: SearchGroundingContext | null) {
  if (!context?.ok) return null;
  return {
    mode: "search_grounded",
    topicTags: context.topicTags,
    originalClaim: context.originalClaim || null,
    originalTone: context.originalTone || null,
    contextSummary: context.contextSummary || null,
    searchQueries: context.searchQueries,
    lensAngles: {
      calm: context.lensAngles.calm || null,
      bridge: context.lensAngles.bridge || null,
      cynical: context.lensAngles.cynical || null,
      opposite: context.lensAngles.opposite || null,
      playful: context.lensAngles.playful || null,
    },
  };
}

function normalizeLockedLenses(raw: any): Partial<Record<TimelineId, ImportedLockedLens>> {
  const out: Partial<Record<TimelineId, ImportedLockedLens>> = {};
  if (!raw || typeof raw !== "object") return out;

  const entries = Array.isArray(raw)
    ? raw.map((item) => [item?.lensId ?? item?.timelineId, item])
    : Object.entries(raw);

  for (const [key, value] of entries) {
    const item = value as ImportedLockedLens;
    const lensId = String(item?.lensId ?? item?.timelineId ?? key) as TimelineId;
    if (!VALID_LENS_IDS.has(lensId)) continue;

    const importedText = typeof item?.text === "string" ? item.text.trim() : "";
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const postId = typeof body?.postId === "string" ? body.postId : undefined;
    const text = typeof body?.text === "string" ? body.text : undefined;

    if (!postId || !text || !text.trim()) {
      return NextResponse.json(
        { ok: false, partialFailure: true, details: [], error: "Missing postId or text" },
        { status: 200 }
      );
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        {
          ok: false,
          partialFailure: true,
          details: [],
          error: "Missing FIREBASE_SERVICE_ACCOUNT_JSON (set it in Vercel Project → Settings → Environment Variables).",
        },
        { status: 200 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          partialFailure: true,
          details: [],
          error: "Missing OPENAI_API_KEY (set it in Vercel Project → Settings → Environment Variables).",
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let adminDb: ReturnType<typeof getAdminDb>;
    try {
      adminDb = getAdminDb();
    } catch (e: any) {
      console.error("[/api/flip] Firebase admin init error:", e);
      return NextResponse.json(
        {
          ok: false,
          partialFailure: true,
          details: [],
          error: `Firebase admin init error: ${e?.message ?? String(e)}`,
        },
        { status: 200 }
      );
    }

    const lockedLenses = normalizeLockedLenses(body?.lockedLenses ?? body?.importedLenses);

    const searchGrounding = shouldUseSearchGrounding(body)
      ? await buildSearchGroundingContext(openai, text)
      : null;

    const lockedResults = await Promise.all(
      Object.entries(lockedLenses).map(async ([lensId, locked]) => {
        const timelineId = lensId as TimelineId;

        await adminDb
          .collection("posts")
          .doc(postId)
          .collection("rewrites")
          .doc(timelineId)
          .set(
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
              locked: true,
              createdAt: adminFieldValue.serverTimestamp(),
              updatedAt: adminFieldValue.serverTimestamp(),
            },
            { merge: true }
          );

        return { timelineId, ok: true, sourceType: locked?.sourceType ?? "imported", locked: true };
      })
    );

    const wc = wordCount(text);
    const minWords = Math.max(5, Math.floor(wc * 0.65));
    const maxWords = Math.max(minWords + 5, Math.ceil(wc * 1.4));
    const aiTimelines = TIMELINE_LIST.filter((timeline) => !lockedLenses[timeline.id]);

    const aiResults = await Promise.all(
      aiTimelines.map(async (timeline) => {
        const timelineId = timeline.id as TimelineId;

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  GLOBAL_REWRITE_SYSTEM_PROMPT +
                  "\n\nFORMAT RULES:\n" +
                  `- Aim for roughly ${wc} words; acceptable range is ${minWords}–${maxWords} words.\n` +
                  "- Usually 1–3 short sentences. Sentence fragments are okay.\n" +
                  "- Output only the rewritten post text.\n" +
                  "- No labels, no bullets, no preamble, no quotation marks around the output.\n" +
                  "- No hashtags unless the original post used them naturally.\n" +
                  "- Preserve the same core idea. Change the human perspective, not the topic.",
              },
              {
                role: "system",
                content:
                  buildSearchGroundingGenerationPrompt(searchGrounding, timelineId, timeline.label) +
                  `Current lens: "${timeline.label}". Do not mention this lens by name.\n\n` +
                  `Lens instructions:\n${timeline.prompt}`,
              },
              { role: "user", content: `Original post:\n${text}` },
            ],
            max_tokens: 280,
            temperature: 0.98,
            presence_penalty: 0.35,
            frequency_penalty: 0.25,
          });

          let rawContent: any = completion.choices[0]?.message?.content ?? "";
          if (Array.isArray(rawContent)) {
            rawContent = rawContent
              .map((part) => (typeof part === "string" ? part : (part as any).text ?? ""))
              .join(" ");
          }

          let finalText =
            (rawContent || "").toString().trim() ||
            "(We couldn't generate this rewrite right now.)";

          const outWc = wordCount(finalText);
          if (finalText && (outWc < minWords || outWc > maxWords)) {
            const fix = await openai.chat.completions.create({
              model: "gpt-4.1-mini",
              messages: [
                {
                  role: "system",
                  content:
                    GLOBAL_REWRITE_SYSTEM_PROMPT +
                    "\n\nRevise the draft only enough to fit the format.\n" +
                    `- Keep it between ${minWords} and ${maxWords} words.\n` +
                    "- Keep the same human instinct/personality.\n" +
                    "- Keep the same core idea.\n" +
                    "- Do not polish away the human rhythm.\n" +
                    "- Output only the revised post text.",
                },
                {
                  role: "system",
                  content:
                    buildSearchGroundingGenerationPrompt(searchGrounding, timelineId, timeline.label) +
                    `Lens: "${timeline.label}". Do not mention this lens by name.\n\n` +
                    `Lens instructions:\n${timeline.prompt}`,
                },
                { role: "user", content: `Original post:\n${text}` },
                { role: "user", content: `Draft rewrite to fix:\n${finalText}` },
              ],
              max_tokens: 280,
              temperature: 0.8,
            });

            let fixed: any = fix.choices[0]?.message?.content ?? "";
            if (Array.isArray(fixed)) {
              fixed = fixed
                .map((part) => (typeof part === "string" ? part : (part as any).text ?? ""))
                .join(" ");
            }
            const fixedText = (fixed || "").toString().trim();
            if (fixedText) finalText = fixedText;
          }

          await adminDb
            .collection("posts")
            .doc(postId)
            .collection("rewrites")
            .doc(timelineId)
            .set(
              {
                timelineId,
                lensId: timelineId,
                text: finalText,
                sourceType: "ai",
                generationMode: searchGrounding?.ok ? "search_grounded" : "classic",
                searchGrounded: !!searchGrounding?.ok,
                locked: false,
                createdAt: adminFieldValue.serverTimestamp(),
                updatedAt: adminFieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          return { timelineId, ok: true, sourceType: "ai", locked: false };
        } catch (err: any) {
          console.error("[/api/flip] Error generating rewrite for", timelineId, err);

          try {
            await adminDb
              .collection("posts")
              .doc(postId)
              .collection("rewrites")
              .doc(timelineId)
              .set(
                {
                  timelineId,
                  lensId: timelineId,
                  text: "(We couldn't generate this rewrite right now.)",
                  sourceType: "ai",
                  locked: false,
                  error: String(err?.message || err),
                  createdAt: adminFieldValue.serverTimestamp(),
                  updatedAt: adminFieldValue.serverTimestamp(),
                },
                { merge: true }
              );
          } catch (writeErr) {
            console.error("[/api/flip] Failed to write stub rewrite:", writeErr);
          }

          return {
            timelineId,
            ok: false,
            sourceType: "ai",
            locked: false,
            error: String(err?.message || err),
          };
        }
      })
    );

    const results = [...lockedResults, ...aiResults];
    const hadErrors = results.some((r) => !r.ok);

    await adminDb
      .collection("posts")
      .doc(postId)
      .set(
        {
          hasImportedLenses: Object.keys(lockedLenses).length > 0,
          importedLensCount: Object.keys(lockedLenses).length,
          lastAiGenerationMode: searchGrounding?.ok ? "search_grounded" : "classic",
          searchGrounding: searchGroundingForFirestore(searchGrounding),
          updatedAt: adminFieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json(
      {
        ok: true,
        partialFailure: hadErrors,
        details: results,
        generationMode: searchGrounding?.ok ? "search_grounded" : "classic",
        searchGrounded: !!searchGrounding?.ok,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/flip] Fatal error:", err);

    return NextResponse.json(
      {
        ok: false,
        partialFailure: true,
        details: [],
        error: err?.message ?? "Internal error generating rewrites",
      },
      { status: 200 }
    );
  }
}
