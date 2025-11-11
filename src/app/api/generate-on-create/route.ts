// src/app/api/generate-on-create/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { TIMELINES, type TimelineId } from "@/theme/timelines";

type ReqBody = {
  original: string;
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "missing_openai_key" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ReqBody;

    if (!body?.original || typeof body.original !== "string") {
      return NextResponse.json(
        { ok: false, error: "missing_original" },
        { status: 400 }
      );
    }

    // Build prompts for each timeline lens
    const entries = Object.values(TIMELINES).map(t => ({
      id: t.id as TimelineId,
      prompt: t.prompt,
    }));

    const system = `You rewrite short social posts into specific "lenses".
- Keep meaning intact
- Be concise (1–3 sentences)
- Match the lens style
- No slurs or insults`;

    const generateOne = async (lensId: TimelineId, lensPrompt: string) => {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: `Lens: ${lensId}\nInstruction: ${lensPrompt}\n---\n${body.original}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 240,
        }),
      });

      if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new Error(`openai_error ${lensId}: ${detail.slice(0, 400)}`);
      }
      const data = await resp.json();
      const text: string = data?.choices?.[0]?.message?.content?.trim() || "";
      return text;
    };

    const results = await Promise.allSettled(
      entries.map(e => generateOne(e.id, e.prompt))
    );

    const candidates: Record<TimelineId, string> = {} as any;
    results.forEach((r, i) => {
      const id = entries[i].id;
      if (r.status === "fulfilled" && r.value) {
        candidates[id] = r.value;
      }
    });

    return NextResponse.json({ ok: true, candidates });
  } catch (err) {
    console.error("generate-on-create error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
