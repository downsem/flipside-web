// src/app/api/feedback/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.flip_id || !body.candidate_id || typeof body.signal === "undefined") {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // TODO: persist to DB/analytics instead of console
    console.log("📝 Feedback received:", body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Feedback route error:", err);
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

export async function GET()     { return NextResponse.json({ ok: true, method: "GET" }); }
export async function HEAD()    { return new NextResponse(null, { status: 200 }); }
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, HEAD, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}
