export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { TIMELINES } from "@/theme/timelines";

// Simple, MVP-friendly batch generator: given original text, return one rewrite per lens
type ReqBody = { original: string };

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "missing_openai_key" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ReqBody | null;
    const original = body?.original?.trim();
    if (!original) {
      return NextResponse.json(
        { ok: false, error: "missing_original" },
        { status: 400 }
      );
    }

    // Exactly the 5 lenses you defined
    const lenses = Object.values(TIMELINES).map((t) => ({
      id: t.id,
      prompt: t.prompt,
    }));

    const systemPrompt =
      `You rewrite short social posts into specific "lenses". ` +
      `Keep meaning intact. Be concise (1–3 sentences). ` +
      `Match the requested lens style exactly.`;

    // Generate all 5 in parallel, but fail-soft per lens
    const results = await Promise.allSettled(
      lenses.map(async (lens) => {
        const userPrompt = `Lens: ${lens.id}\nInstructions: ${lens.prompt}\n---\n${original}`;
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
          throw new Error(
            `openai_error(${lens.id}): ${detail.slice(0, 500)}`
          );
        }

        const data = await resp.json();
        const text: string =
          data?.choices?.[0]?.message?.content?.trim() || "";
        return { lensId: lens.id, text };
      })
    );

    // Build payload: only include fulfilled ones; note failures for UI/telemetry if needed
    const payload: Record<string, string> = {};
    const errors: Array<{ lensId: string; error: string }> = [];

    results.forEach((r, i) => {
      const lensId = lenses[i].id;
      if (r.status === "fulfilled") {
        payload[lensId] = r.value.text;
      } else {
        errors.push({ lensId, error: String(r.reason || "unknown_error") });
      }
    });

    return NextResponse.json({ ok: true, candidates: payload, errors });
  } catch (err) {
    console.error("batch-generate error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
