// src/app/api/flip/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db, serverTimestamp } from "../../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId } from "@/theme/timelines";

export const runtime = "nodejs";
export const revalidate = 0;

// Ensure we have an API key up front
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("OPENAI_API_KEY is not set in the environment.");
}

const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { postId, text } = body as { postId?: string; text?: string };

    if (!postId || !text) {
      return NextResponse.json(
        { error: "Missing postId or text" },
        { status: 400 }
      );
    }

    const completions = await Promise.all(
      TIMELINE_LIST.map(async (timeline) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: timeline.prompt },
            {
              role: "user",
              content: `Original post:\n\n${text}\n\nRewrite according to the timeline instructions.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        const content =
          completion.choices[0]?.message?.content?.trim() ?? text;

        return {
          timelineId: timeline.id as TimelineId,
          text: content,
        };
      })
    );

    const rewritesCol = collection(db, "posts", postId, "rewrites");

    for (const item of completions) {
      const rewriteRef = doc(rewritesCol, item.timelineId);
      await setDoc(rewriteRef, {
        id: item.timelineId,
        postId,
        timelineId: item.timelineId,
        text: item.text,
        createdAt: serverTimestamp(),
        votes: 0,
        replyCount: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error in /api/flip:", err);

    // Try to surface a human-readable message to the browser
    const message =
      err?.response?.data?.error?.message ??
      err?.message ??
      "Failed to generate rewrites";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
