import { NextResponse } from "next/server";

/**
 * Minimal endpoint to receive swipe feedback.
 * This prevents 404s when SwipeDeck calls /api/feedback.
 * In the future you can extend this to log or train models.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => null);
    console.log("Feedback received:", data); // You can remove this later
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Feedback route error:", err);
    return new NextResponse("Bad Request", { status: 400 });
  }
}

// Optional: handle other methods gracefully
export async function GET() {
  return NextResponse.json({ ok: true, message: "Feedback endpoint ready." });
}
