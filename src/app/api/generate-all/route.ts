// src/app/api/generate-all/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Keep this in sync with src/theme/timelines.ts
const LENSES = ["calm", "bridge", "cynical", "opposite", "playful"] as const;
type Lens = (typeof LENSES)[number];

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "missing_openai_key" }, { status: 500 });
    }

    const { original } = (await req.json()) as { original?: string };
    if (!original || typeof original !== "string") {
      return NextResponse.json({ ok: false, error: "missing_original" }, { status: 400 });
    }

    // one request per lens (simple & reliable)
    const results: Record<Lens, string> = {} as any;

    for (const lens of LENSES) {
      const system = `You rewrite short social posts into specific "lenses".
- Keep meaning intact.
- Be concise (1–3 sentences).
- Match the requested lens style.`;
      const user = `Lens: ${lens}\n---\n${original}`;

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
            { role: "user", content: user },
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
      results[lens] = text;
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("/api/generate-all error", err);
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
