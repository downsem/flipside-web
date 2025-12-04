import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db, serverTs } from "@/app/firebase";
import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import { TIMELINE_LIST } from "@/theme/timelines";
import type { TimelineSpec } from "@/theme/timelines";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { postId, text } = (await req.json()) as {
      postId?: string;
      text?: string;
    };

    if (!postId || !text) {
      return NextResponse.json(
        { error: "Missing postId or text" },
        { status: 400 }
      );
    }

    const rewritesCol = collection(db, "posts", postId, "rewrites");

    const completions = await Promise.all(
      TIMELINE_LIST.map(async (timeline: TimelineSpec) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: timeline.prompt,
            },
            {
              role: "user",
              content: `Original post:\n\n${text}\n\nRewrite according to the instructions.`,
            },
          ],
          temperature: 0.7,
        });

        const content =
          completion.choices[0]?.message?.content?.trim() ||
          "No rewrite generated.";

        const ref = doc(rewritesCol, timeline.id);

        await setDoc(ref, {
          timelineId: timeline.id,
          text: content,
          createdAt: serverTs(),
          votes: 0,
        });

        return { timelineId: timeline.id, text: content };
      })
    );

    return NextResponse.json({ ok: true, rewrites: completions });
  } catch (err) {
    console.error("Error in /api/flip:", err);
    return NextResponse.json(
      { error: "Internal error generating rewrites" },
      { status: 500 }
    );
  }
}
