// src/app/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  serverTs,
  ensureUserProfile,
  loginAnonymously,
} from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

type SourceType = "original" | "import-other";

function detectPlatform(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("threads.net")) return "threads";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "bluesky";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    if (host.includes("reddit.com")) return "reddit";
    return "other";
  } catch {
    return "other";
  }
}

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Single optional "original post link" input
  const [hasSourceLink, setHasSourceLink] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  // Stable auth state (avoids auth.currentUser flicker on first paint)
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    setError(null);

    try {
      // Validate optional link
      const urlTrimmed = sourceUrl.trim();
      if (hasSourceLink && urlTrimmed) {
        try {
          // throws if invalid
          new URL(urlTrimmed);
        } catch {
          setError("That link doesn't look valid. Please paste a full URL.");
          setBusy(false);
          return;
        }
      }

      const finalSourceUrl = hasSourceLink && urlTrimmed ? urlTrimmed : null;
      const sourceType: SourceType = finalSourceUrl ? "import-other" : "original";
      const sourcePlatform = finalSourceUrl ? detectPlatform(finalSourceUrl) : null;

      // Ensure we always have *some* Firebase user (anonymous is fine)
      let u = auth.currentUser;
      if (!u) {
        u = await loginAnonymously();
        setUser(u);
      }

      // If user is NOT anonymous, ensure profile doc exists (Google sign-in)
      if (u && !u.isAnonymous) {
        await ensureUserProfile(u);
      }

      const postsCol = collection(db, "posts");
      const postRef = doc(postsCol);

      await setDoc(postRef, {
        id: postRef.id,
        text: text.trim(),
        authorId: u?.uid ?? null,
        createdAt: serverTs(),
        votes: 0,
        replyCount: 0,
        sourceType,
        sourceUrl: finalSourceUrl,
        sourcePlatform,
        authorIsAnonymous: !!u?.isAnonymous,
      });

      // Call API with postId + text so rewrites get written to Firestore
      const res = await fetch("/api/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postRef.id,
          text: text.trim(),
        }),
      });

      const json = await res.json().catch(() => null);

      // If API explicitly failed, show the returned error string (super helpful)
      if (!res.ok || !json?.ok) {
        console.error("Error generating rewrites:", json ?? (await res.text()));
        setError(json?.error ?? "Something went wrong creating your flip. Please try again.");
        setBusy(false);
        return;
      }

      router.push("/feed");
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !busy;

  // Show sign-in CTA if not signed in OR signed in anonymously
  const showSignInBox = !user || !!user?.isAnonymous;

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        <header className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Add Flip</h1>
            <div className="flex items-center gap-3">
              <Link
                href="/prototype/create"
                className="text-sm font-medium text-slate-800 underline"
              >
                Check out People Mode
              </Link>
              <Link
                href="/feed"
                className="text-sm font-medium text-slate-800 underline"
              >
                Explore more flips →
              </Link>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text input */}
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <textarea
              className="h-40 w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Paste a post, quote, or hot take that needs to be unpacked..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </div>

          {/* ✅ Single optional link section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={hasSourceLink}
                onChange={(e) => setHasSourceLink(e.target.checked)}
                disabled={busy}
              />
              <span className="font-medium">Link to original social post</span>
            </label>

            {hasSourceLink && (
              <div className="mt-2">
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste the original post URL…"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  disabled={busy}
                />
                <div className="mt-1 text-xs text-slate-500">
                  We’ll show this link on the Flip so people can trace it back to the source.
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-slate-700 px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            Generate Flip
          </button>

          {/* Sign-in CTA */}
          {showSignInBox && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">
                You can try Flipside without signing in.
                <br />
                <span className="text-slate-500 text-xs">
                  Sign in later to keep your flips.
                </span>
              </span>
              <Link
                href="/account"
                className="ml-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
              >
                Sign in
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}