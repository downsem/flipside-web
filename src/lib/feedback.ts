// Lightweight client helper to POST swipe feedback.
// Safe to import in client components.

export type FeedbackPayload = {
  flip_id: string;
  candidate_id: string;
  signal: 1 | -1;
  timeline_id: string;
  seen_ms?: number;
  context?: Record<string, any>;
};

const FEEDBACK_ENDPOINT = "/api/feedback";
const MAX_BEACON_BYTES = 64 * 1024; // ~64KB safety cap

/** Fire-and-forget; returns true if the request was handed off successfully. */
export async function postFeedback(payload: FeedbackPayload): Promise<boolean> {
  try {
    // Prefer sendBeacon when available and payload is small (best effort, non-blocking)
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      // Most browsers limit beacon size; guard to avoid silent drops
      if (body.length < MAX_BEACON_BYTES) {
        const ok = navigator.sendBeacon(FEEDBACK_ENDPOINT, new Blob([body], { type: "application/json" }));
        return ok; // indicates the browser accepted the beacon
      }
    }

    // Fallback to fetch with a short timeout so UI stays snappy
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), 1500) : undefined;

    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // lets the browser attempt to send during unload
      signal: controller?.signal,
    }).catch((e) => {
      // If aborted due to timeout, treat as best-effort sent
      if (e?.name === "AbortError") return undefined;
      throw e;
    });

    if (timeout) clearTimeout(timeout);
    // If fetch timed out (res undefined) we still return true—best effort
    return res ? res.ok : true;
  } catch (err) {
    // Don’t crash UI if feedback endpoint is down.
    console.warn("feedback failed (best-effort)", err);
    return false;
  }
}
