// src/app/api/flip/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  GLOBAL_REWRITE_SYSTEM_PROMPT,
  TIMELINE_LIST,
  type TimelineId,
} from "@/theme/timelines";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

// NOTE: Do NOT initialize the OpenAI client at module-load time.
// Next can evaluate route modules during build/collect; missing env vars would crash builds.

function wordCount(s: string) {
  const w = s.trim().split(/\s+/).filter(Boolean);
  return w.length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const postId = typeof body?.postId === "string" ? body.postId : undefined;
    const text = typeof body?.text === "string" ? body.text : undefined;

    if (!postId || !text || !text.trim()) {
      return NextResponse.json(
        {
          ok: false,
          partialFailure: true,
          details: [],
          error: "Missing postId or text",
        },
        { status: 200 }
      );
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        {
          ok: false,
          partialFailure: true,
          details: [],
          error:
            "Missing FIREBASE_SERVICE_ACCOUNT_JSON (set it in Vercel Project → Settings → Environment Variables).",
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
          error:
            "Missing OPENAI_API_KEY (set it in Vercel Project → Settings → Environment Variables).",
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

    // Keep outputs concise, but leave enough room for human rhythm and behavioral realism.
    const wc = wordCount(text);
    const minWords = Math.max(5, Math.floor(wc * 0.65));
    const maxWords = Math.max(minWords + 5, Math.ceil(wc * 1.4));

    const results = await Promise.all(
      TIMELINE_LIST.map(async (timeline) => {
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
                  `Current lens: "${timeline.label}". Do not mention this lens by name.\n\n` +
                  `Lens instructions:\n${timeline.prompt}`,
              },
              {
                role: "user",
                content: `Original post:\n${text}`,
              },
            ],
            max_tokens: 280,
            temperature: 0.98,
            presence_penalty: 0.35,
            frequency_penalty: 0.25,
          });

          let rawContent: any = completion.choices[0]?.message?.content ?? "";

          if (Array.isArray(rawContent)) {
            rawContent = rawContent
              .map((part) =>
                typeof part === "string" ? part : (part as any).text ?? ""
              )
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
                .map((part) =>
                  typeof part === "string" ? part : (part as any).text ?? ""
                )
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
                text: finalText,
                createdAt: adminFieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          return { timelineId, ok: true };
        } catch (err: any) {
          console.error(
            "[/api/flip] Error generating rewrite for",
            timelineId,
            err
          );

          try {
            await adminDb
              .collection("posts")
              .doc(postId)
              .collection("rewrites")
              .doc(timelineId)
              .set(
                {
                  timelineId,
                  text: "(We couldn't generate this rewrite right now.)",
                  error: String(err?.message || err),
                  createdAt: adminFieldValue.serverTimestamp(),
                },
                { merge: true }
              );
          } catch (writeErr) {
            console.error("[/api/flip] Failed to write stub rewrite:", writeErr);
          }

          return { timelineId, ok: false, error: String(err?.message || err) };
        }
      })
    );

    const hadErrors = results.some((r) => !r.ok);

    return NextResponse.json(
      { ok: true, partialFailure: hadErrors, details: results },
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
