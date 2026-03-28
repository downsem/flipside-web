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
} from "@/app/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";

type SourceType = "original" | "import-other";
type FlipMode = "ai" | "people";

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

export default function CreateFlipPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSourceLink, setHasSourceLink] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<FlipMode>("ai");

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
      const urlTrimmed = sourceUrl.trim();
      if (hasSourceLink && urlTrimmed) {
        try {
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

      let u = auth.currentUser;
      if (!u) {
        u = await loginAnonymously();
        setUser(u);
      }

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
        flipType: mode,
        status: mode === "people" ? "draft" : "published",
      });

      if (mode === "ai") {
        const res = await fetch("/api/flip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: postRef.id,
            text: text.trim(),
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          console.error("Error generating rewrites:", json ?? (await res.text()));
        }

        router.push("/feed");
        return;
      }

      router.push(`/create/match/${postRef.id}`);
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !busy;
  const showSignInBox = !user || !!user?.isAnonymous;

  return (
    <AppShell title="Create">
      <div className="mb-4 space-y-4">
        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xl font-semibold text-neutral-900">See the other side of any idea.</div>
          <p className="mt-2 text-sm text-neutral-600">
            Build an AI flip instantly or make a People deck by matching real posts across the five lenses.
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Mode</div>
          <div className="mt-3 inline-flex rounded-full border border-neutral-200 bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`min-h-[40px] rounded-full px-4 text-sm font-medium ${
                mode === "ai" ? "bg-neutral-900 text-white" : "text-neutral-700"
              }`}
            >
              AI
            </button>
            <button
              type="button"
              onClick={() => setMode("people")}
              className={`min-h-[40px] rounded-full px-4 text-sm font-medium ${
                mode === "people" ? "bg-neutral-900 text-white" : "text-neutral-700"
              }`}
            >
              People
            </button>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            {mode === "ai"
              ? "AI creates all five lens rewrites for you right away."
              : "People mode turns your post into an anchor, then you match one real flip for each lens before publishing the deck."}
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">How it works</div>
          <div className="mt-3 grid gap-2 text-sm text-neutral-700 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 px-3 py-3">1. Add a post</div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-3">
              {mode === "ai" ? "2. Generate the five lenses" : "2. Match one real post per lens"}
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-3">
              {mode === "ai" ? "3. Share or react" : "3. Publish the People deck"}
            </div>
          </div>
        </div>
      </div>

      <form id="create-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <textarea
            className="h-40 w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="Paste a post, quote, or hot take that needs to be unpacked..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
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
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm"
                disabled={busy}
              />
              <div className="mt-1 text-xs text-slate-500">
                We’ll show this link on the Flip so people can trace it back to the source.
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <Button type="submit" loading={busy} disabled={!canSubmit} className="w-full">
          {mode === "ai" ? "Generate Flip" : "Match Flips"}
        </Button>

        {showSignInBox && (
          <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
            <span className="text-slate-600">
              You can try Flipside without signing in.
              <br />
              <span className="text-slate-500 text-xs">Sign in later to keep your flips.</span>
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
    </AppShell>
  );
}
