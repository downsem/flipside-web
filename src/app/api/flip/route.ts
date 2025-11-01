// src/app/api/flip/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { original, prompt }: { original?: string; prompt?: string } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "missing_openai_key" }, { status: 500 });
    }
    if (!original || !prompt) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const system = `You rewrite text in specific styles ("lenses"): calm, bridge, cynical, opposite, playful, etc.
Keep the rewrite concise (1–3 sentences), preserve the core meaning, and clearly reflect the lens.`;

    const user = `Lens: ${prompt}
Original: ${original}
Rewrite:`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, text });
  } catch (err) {
    console.error("flip route error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// CORS-friendly preflight (optional)
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
