// src/app/api/feedback/route.ts
import { NextResponse } from "next/server";

/**
 * POST /api/feedback
 * Receives feedback from the client. Replace console.log with a DB write or analytics call.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic shape check
    if (!body.flip_id || !body.candidate_id || typeof body.signal === "undefined") {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    // TODO: persist to your DB or analytics service
    console.log("📝 Feedback received:", body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Feedback route error:", err);
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

/**
 * GET /api/feedback
 * Exists so HEAD/GET checks don't 404 in production. Returns 405 to indicate POST-only.
 */
export async function GET() {
  return new Response("Method Not Allowed: POST only", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

/**
 * HEAD /api/feedback
 * Same as GET but without a body.
 */
export async function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}

/**
 * OPTIONS /api/feedback
 * Lets CORS preflights succeed (handy during local testing or if you ever hit this route cross-origin).
 * If you prefer to lock this down, replace '*' with your exact origin or remove this handler.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
