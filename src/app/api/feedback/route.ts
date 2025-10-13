// src/app/api/feedback/route.ts
import { NextResponse } from "next/server";

/**
 * Simple POST endpoint that receives feedback from SwipeDeck.
 * In production, replace the console.log() with a DB write or analytics call.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Optionally validate the shape
    if (!body.flip_id || !body.candidate_id || !body.signal) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // For now, just log it
    console.log("📝 Feedback received:", body);

    // TODO: persist to your DB or analytics service
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Feedback route error:", err);
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
