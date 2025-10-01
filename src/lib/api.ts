// src/lib/api.ts
export type Flip = { promptKind: string; text: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://flipside.fly.dev";

export async function generateFlips(
  originalText: string,
  promptKinds?: string[]
): Promise<{ flips: Flip[] }> {
  const res = await fetch(`${API_BASE}/generate_flips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      promptKinds ? { originalText, promptKinds } : { originalText }
    ),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(
      `generate_flips failed: ${res.status} ${msg || res.statusText}`
    );
  }
  return res.json();
}
