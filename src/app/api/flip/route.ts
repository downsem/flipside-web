// src/app/api/flip/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function wordCount(s: string) {
  const w = s.trim().split(/\s+/).filter(Boolean);
  return w.length;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const postId = body.postId as string | undefined;
    const text = body.text as string | undefined;

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

    const adminDb = getAdminDb();

    // Length targeting: keep rewrites within ±10% of original word count (with a small floor)
    const wc = wordCount(text);
    const minWords = Math.max(8, Math.floor(wc * 0.9));
    const maxWords = Math.max(minWords + 2, Math.ceil(wc * 1.1));

    const results = await Promise.all(
      TIMELINE_LIST.map(async (timeline) => {
        const timelineId = timeline.id as TimelineId;

        try {
          // Primary generation
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  "You rewrite social media posts into different lenses.\n" +
                  "Output rules (must follow):\n" +
                  `- Match the original length: target ${wc} words; must be between ${minWords} and ${maxWords} words.\n` +
                  "- Keep it tweet-like: 1–3 short sentences.\n" +
                  "- No preamble, no labels, no bullet points, no quotes around the output.\n" +
                  "- No hashtags. No emojis.\n" +
                  "- Preserve the original topic and intent; only change framing/tone per lens.",
              },
              {
                role: "system",
                content:
                  `Current lens: "${timeline.label}".\n` +
                  `Lens instructions:\n${timeline.prompt}`,
              },
              {
                role: "user",
                content: `Original post:\n${text}`,
              },
            ],
            // Keep tokens bounded; length is enforced via word-range rules above
            max_tokens: 220,
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

          // If it drifts outside the word range, do one quick corrective pass.
          const outWc = wordCount(finalText);
          if (finalText && (outWc < minWords || outWc > maxWords)) {
            const fix = await openai.chat.completions.create({
              model: "gpt-4.1-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Revise the text to meet strict length + format rules.\n" +
                    `- Must be between ${minWords} and ${maxWords} words.\n` +
                    "- 1–3 short sentences.\n" +
                    "- No hashtags. No emojis.\n" +
                    "- Keep the same meaning and same lens.\n" +
                    "- Output ONLY the revised post text.",
                },
                {
                  role: "system",
                  content:
                    `Lens: "${timeline.label}".\n` +
                    `Lens instructions:\n${timeline.prompt}`,
                },
                { role: "user", content: `Original post:\n${text}` },
                { role: "user", content: `Draft rewrite to fix:\n${finalText}` },
              ],
              max_tokens: 220,
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

          // Best-effort stub write
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
        error: "Internal error generating rewrites",
      },
      { status: 200 }
    );
  }
}
