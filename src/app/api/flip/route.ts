export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type FlipRequest = {
  original: string;
  // we accept either name, for resilience to older clients:
  lens?: string;
  prompt?: string;
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

    const lens = (body.lens ?? body.prompt ?? "default").toString().trim();
    const systemPrompt = `You rewrite short social posts into specific "lenses".
- Keep meaning.
- Be concise (1–3 sentences).
- Match the requested lens style.
- If lens is "default" return a clear neutral rewording.`;

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
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "openai_error", detail: text.slice(0, 800) },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error("flip route error:", err?.message || err);
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
