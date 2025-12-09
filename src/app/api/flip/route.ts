// src/app/api/flip/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/app/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";

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
        { error: "Missing postId or text" },
        { status: 400 }
      );
    }

    // NOTE:
    // We intentionally do NOT early-return if OPENAI_API_KEY is missing.
    // Instead, we let the per-timeline try/catch below handle any OpenAI errors,
    // write stub rewrites, and still return 200 to the client. That way the
    // flip creation never “fails” just because rewrites couldn’t be generated.

    const results = await Promise.all(
      TIMELINE_LIST.map(async (timeline) => {
        const timelineId = timeline.id as TimelineId;
        const rewriteRef = doc(db, "posts", postId, "rewrites", timelineId);

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  "You rewrite social media posts into different lenses. " +
                  "Always keep the result under 120 words, suitable as a single social post.",
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

          let rawContent = completion.choices[0]?.message?.content ?? "";

          // In the new SDK, content *can* be an array; normalize to string.
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

          await setDoc(
            rewriteRef,
            {
              timelineId,
              text: finalText,
              createdAt: serverTimestamp(),
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

          // Still write a stub so the UI has something to show.
          await setDoc(
            rewriteRef,
            {
              timelineId,
              text: "(We couldn't generate this rewrite right now.)",
              error: String(err?.message || err),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          return {
            timelineId,
            ok: false,
            error: String(err?.message || err),
          };
        }
      })
    );

    const hadErrors = results.some((r) => !r.ok);

    // IMPORTANT: Always return 200 here so the Add page doesn’t show a fatal error.
    // The UI can optionally inspect `partialFailure` if you ever want to surface a softer warning.
    return NextResponse.json(
      {
        ok: true,
        partialFailure: hadErrors,
        details: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/flip] Fatal error:", err);

    // Even on a top-level failure, don’t kill the flip UX.
    // Return 200 with a marker that rewrites failed entirely.
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
