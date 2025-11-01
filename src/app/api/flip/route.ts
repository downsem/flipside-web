// src/app/api/flip/route.ts
export const runtime = "nodejs";          // ✅ valid: "edge" | "experimental-edge" | "nodejs"
export const dynamic = "force-dynamic";   // do not prerender this route

import { NextResponse } from "next/server";

type FlipRequest = {
  original: string;   // original text to rewrite
  lens?: string;      // optional lens/prompt key, e.g., "calm", "bridge", etc.
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FlipRequest;

    if (!body?.original || typeof body.original !== "string") {
      return NextResponse.json({ ok: false, error: "missing_original" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "missing_openai_key" }, { status: 500 });
    }

    const lens = body.lens?.trim() || "default";
    const systemPrompt = `You rewrite short social posts into specific "lenses" (a.k.a. timelines).
- Keep meaning intact.
- Be concise (1–3 sentences).
- Match the requested lens style.
- If lens is "default" return a clean, readable version with neutral tone.`;

    const userPrompt = `Lens: ${lens}\n---\n${body.original}`;

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
        max_tokens: 240,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "openai_error", detail: detail.slice(0, 800) },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ ok: true, text });
  } catch (err) {
    console.error("flip route error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  // CORS (loose for now; lock down later if needed)
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}