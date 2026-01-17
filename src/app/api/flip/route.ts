import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";
import { getAdminDb, adminFieldValue } from "@/lib/firebaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
                  "You rewrite social media posts into different lenses. Always keep the result under 120 words, suitable as a single social post.",
              },
              {
                role: "system",
                content:
                  `Current lens: "${timeline.label}". ` +
                  `Lens instructions:\n${timeline.prompt}`,
              },
              {
                role: "user",
                content: `Original post:\n${text}`,
              },
            ],
            max_tokens: 256,
          });

          let rawContent: any = completion.choices[0]?.message?.content ?? "";

          // Normalize content to string
          if (Array.isArray(rawContent)) {
            rawContent = rawContent
              .map((part) =>
                typeof part === "string" ? part : (part as any).text ?? ""
              )
              .join(" ");
          }

          const finalText =
            (rawContent || "").toString().trim() ||
            "(We couldn't generate this rewrite right now.)";

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
          console.error("[/api/flip] Error generating rewrite for", timelineId, err);

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
