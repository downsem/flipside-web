"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth, db, serverTimestamp } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TEXT_MAX = 1000; // character limit

export default function AddFlipPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, loading, authError] = useAuthState(auth);

  // Ensure anon auth is established
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch((e) => console.error("Anon sign-in failed", e));
    });
    return () => unsub();
  }, []);

  const remaining = useMemo(() => TEXT_MAX - text.length, [text]);
  const overLimit = remaining < 0;
  const canSubmit = !loading && !submitting && !!user && text.trim().length > 0 && !overLimit;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    if (error) setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Not signed in. Please refresh the page.");
      return;
    }
    const original = text.trim();
    if (!original) {
      setError("Please write something first.");
      return;
    }
    if (original.length > TEXT_MAX) {
      setError(`Too long. Please stay under ${TEXT_MAX} characters.`);
      return;
    }

    try {
      setSubmitting(true);

      // Fetch with a timeout to avoid hanging
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      const r = await fetch(`${API_BASE}/filter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText: original }),
        signal: controller.signal,
      }).catch((e) => {
        // Turn AbortError into a friendlier message
        if (e?.name === "AbortError") throw new Error("The server took too long to respond. Please try again.");
        throw e;
      });
      clearTimeout(timeout);

      if (!r || !r.ok) {
        const msg = r ? await r.text() : "Network error";
        throw new Error(`Filter service error: ${msg}`);
      }
      const { filteredText } = (await r.json()) as { filteredText: string };

      await addDoc(collection(db, "posts"), {
        originalText: original,
        filteredText: filteredText || original, // fallback just in case
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });

      setSuccess("Posted! Redirecting to the feed…");
      // Small pause so user sees confirmation
      setTimeout(() => (window.location.href = "/"), 700);
    } catch (err: any) {
      console.error("Submit failed:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-800">&larr; Back to Feed</Link>
      </header>

      <h1 className="text-3xl font-bold mb-6">Add a Flip</h1>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <textarea
          className="w-full min-h-[200px] border rounded-xl p-4 text-lg"
          placeholder="Vent here…"
          value={text}
          onChange={handleChange}
          maxLength={TEXT_MAX + 500} // allow a bit over, we enforce ourselves
        />
        <div className="flex items-center justify-between text-sm">
          <span className={overLimit ? "text-red-600" : "text-gray-500"}>
            {remaining >= 0 ? `${remaining} characters left` : `${-remaining} over the limit`}
          </span>
          {!user && !loading && <span className="text-red-600">Not signed in</span>}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-5 py-2 rounded-xl bg-black text-white text-lg disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>

          {/* Inline messages */}
          {error && (
            <span role="alert" aria-live="assertive" className="text-red-600">
              {error}
            </span>
          )}
          {success && (
            <span role="status" aria-live="polite" className="text-green-700">
              {success}
            </span>
          )}
          {authError && <span className="text-red-600">{authError.message}</span>}
        </div>
      </form>
    </main>
  );
}
