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

    if (!process.env.OPENAI_API_KEY) {
      console.error("[/api/flip] OPENAI_API_KEY is not set on the server");
      return NextResponse.json(
        { error: "Server misconfigured: missing OpenAI key" },
        { status: 500 }
      );
    }

    // Generate a rewrite for each timeline in parallel.
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
    return NextResponse.json(
      { error: "Internal error generating rewrites" },
      { status: 500 }
    );
  }
}
