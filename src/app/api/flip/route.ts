import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "../../firebase";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineId, TimelineSpec } from "@/theme/timelines";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, text } = body as { postId?: string; text?: string };

    if (!postId || !text) {
      return NextResponse.json(
        { error: "Missing postId or text" },
        { status: 400 }
      );
    }

    // Use the array version of your timelines
    const timelineList: TimelineSpec[] = TIMELINE_LIST;

    // Generate rewrites for each timeline in parallel
    const completions = await Promise.all(
      timelineList.map(async (timeline) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: timeline.prompt },
            {
              role: "user",
              content: `Original post:\n\n${text}\n\nRewrite according to the instructions.`,
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
  } catch (err) {
    console.error("Error in /api/flip:", err);
    return NextResponse.json(
      { error: "Failed to generate rewrites" },
      { status: 500 }
    );
  }
}
