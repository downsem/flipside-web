// src/app/api/generate-on-create/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type ReqBody = {
  original: string;
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const LENSES = ["calm", "bridge", "cynical", "opposite", "playful"] as const;

function lensToInstruction(lens: (typeof LENSES)[number]): string {
  switch (lens) {
    case "calm":
      return "Rewrite so it is calm, non-toxic, and constructive. Keep meaning intact, concise (1–3 sentences).";
    case "bridge":
      return "Rewrite to acknowledge the original concern AND the other side’s strongest concerns. Aim for pragmatic compromise, 1–3 sentences.";
    case "cynical":
      return "Rewrite with dry humor and sharp skepticism. Concise, clever, grounded in truth—never cruel, 1–3 sentences.";
    case "opposite":
      return "Take the opposite conclusion with the opponent’s best reasoning. No insults, concise (1–3 sentences).";
    case "playful":
      return "Light satire/absurd humor. Meaning recognizable but slightly exaggerated for comic effect. Fun, not mean. 1–3 sentences.";
  }
}

async function generateOne(original: string, lens: (typeof LENSES)[number]) {
  const systemPrompt =
    'You rewrite short social posts into specific "lenses" (styles). Keep meaning, be concise (1–3 sentences), and match the lens.';
  const userPrompt = `Lens: ${lens}\nInstruction: ${lensToInstruction(
    lens
  )}\n---\n${original}`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 220,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`openai_error(${lens}): ${detail.slice(0, 800)}`);
  }

  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim() || "";
  return text;
}

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

    const results = await Promise.all(
      LENSES.map(async (lens) => {
        const t = await generateOne(body.original, lens);
        return [lens, t] as const;
      })
    );

    const rewrites: Record<string, string> = {};
    for (const [lens, text] of results) {
      rewrites[lens] = text;
    }

    return NextResponse.json({ ok: true, rewrites });
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
