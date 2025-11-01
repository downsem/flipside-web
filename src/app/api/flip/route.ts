// src/app/api/flip/route.ts
export const runtime = "node";            // or "edge" if you prefer; both fine here
export const dynamic = "force-dynamic";   // never prerender this route

import { NextResponse } from "next/server";

type FlipRequest = {
  original: string;         // original text to rewrite
  lens?: string;            // optional lens/prompt key, e.g. "calm", "bridge", etc.
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
    const sys = `You rewrite short social posts into specific "lenses" (a.k.a. timelines).
- Keep meaning intact.
- Be concise (1–3 sentences).
- Match the requested lens style.
- If lens is "default" return a clean, readable version with neutral tone.`;

    const user = `Lens: ${lens}\n---\n${body.original}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 240,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "openai_error", detail: errText.slice(0, 800) },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "";

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error("flip route error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  // CORS (adjust origins if you later need to lock this down)
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
