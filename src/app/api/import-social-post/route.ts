// src/app/api/import-social-post/route.ts
import { NextResponse } from "next/server";
import { importSocialPostFromUrl } from "@/lib/socialImport";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    const sharedText = typeof body?.sharedText === "string" ? body.sharedText : typeof body?.text === "string" ? body.text : "";

    const result = await importSocialPostFromUrl(rawUrl, { sharedText });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[/api/import-social-post] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not import social post." },
      { status: 200 }
    );
  }
}
