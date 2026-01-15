// src/app/add/page.tsx
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, serverTs, ensureUserProfile } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";

type SourceType = "original" | "import-self" | "import-other";

type SourcePlatform = "x" | "threads" | "bluesky" | "truth" | "reddit" | "other";

const PLATFORM_LABEL: Record<SourcePlatform, string> = {
  x: "x",
  threads: "threads",
  bluesky: "bluesky",
  truth: "truth",
  reddit: "reddit",
  other: "source",
};

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<SourceType>("original");
  const [sourcePlatform, setSourcePlatform] = useState<SourcePlatform>("x");
  const [sourceUrl, setSourceUrl] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);

  const router = useRouter();
  const isImported = sourceType !== "original";

  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  function handleSourceTypeChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value as SourceType;
    setSourceType(value);
  }

  function handleImportFromUrl() {
    if (!sourceUrl.trim()) {
      setLinkSaved(false);
      return;
    }
    setLinkSaved(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    const currentUser = auth.currentUser;

    // NOTE: Do not change flow/logic here — leaving as-is:
    if (!currentUser) {
      setError("Please sign in to create a flip.");
      return;
    }

    if (isImported && !sourceUrl.trim()) {
      setError("Please include a link to the original post or page.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await ensureUserProfile(currentUser);

      const postsCol = collection(db, "posts");
      const postRef = doc(postsCol);

      await setDoc(postRef, {
        id: postRef.id,
        text: text.trim(),
        authorId: currentUser.uid,
        createdAt: serverTs(),
        votes: 0,
        replyCount: 0,
        sourceType,
        sourcePlatform: isImported ? sourcePlatform : null,
        sourceUrl: isImported ? sourceUrl.trim() : null,
      });

      const res = await fetch("/api/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postRef.id,
          text: text.trim(),
        }),
      });

      if (!res.ok) {
        console.error("Error generating rewrites", await res.text());
        setError("Something went wrong creating your flip. Please try again.");
        setBusy(false);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  const canSubmit =
    text.trim().length > 0 &&
    !busy &&
    (!isImported || sourceUrl.trim().length > 0);

  return (
    <div className="min-h-screen bg-white flex justify-center px-4 py-4 sm:py-6">
      <div className="w-full max-w-2xl">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
              FS
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Flipside</div>
              <div className="text-[11px] text-slate-500">Add a Flip</div>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-[12px] font-medium text-white shadow-sm"
          >
            Explore more flips →
          </Link>
        </header>

        {/* Hero copy (tight on mobile) */}
        <div className="mb-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
            There’s another side to every post
          </h1>
          <p className="mt-2 text-[13px] sm:text-sm text-slate-600 max-w-xl">
            Drop in a post below and Flipside will show you some alternative angles
          </p>
        </div>

        {/* Lightweight “try without signing in” banner — only when signed out */}
        {!user && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="text-[12px] text-slate-700 leading-snug">
              You can try Flipside without signing in.{" "}
              <span className="text-slate-500">(Sign in later to keep your flips.)</span>
            </div>
            <Link
              href="/account"
              className="shrink-0 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-[12px] font-medium text-slate-800"
            >
              Sign in
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source type selector (compact grid) */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">What are you flipping?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[13px] text-slate-800">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="original"
                  checked={sourceType === "original"}
                  onChange={handleSourceTypeChange}
                />
                <span>Original thought or post</span>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-self"
                  checked={sourceType === "import-self"}
                  onChange={handleSourceTypeChange}
                />
                <span>My post from another platform</span>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-other"
                  checked={sourceType === "import-other"}
                  onChange={handleSourceTypeChange}
                />
                <span>Someone else&apos;s public post</span>
              </label>
            </div>
          </div>

          {/* Imported metadata fields (kept, just tightened) */}
          {isImported && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Original post link (optional)
                  </p>
                  <p className="text-[12px] text-slate-500">
                    Paste a link for context (start with the text if that’s easier).
                  </p>
                </div>

                <select
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value as SourcePlatform)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="x">X</option>
                  <option value="threads">Threads</option>
                  <option value="bluesky">Bluesky</option>
                  <option value="truth">Truth Social</option>
                  <option value="reddit">Reddit</option>
                  <option value="other">Other / Website</option>
                </select>
              </div>

              <div className="space-y-2">
                <input
                  id="sourceUrl"
                  type="url"
                  placeholder="Paste the link to the original post here for context (just an option but, start with the text if that’s easier)"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setLinkSaved(false);
                  }}
                  disabled={busy}
                />

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    We’ll show this as a small “{PLATFORM_LABEL[sourcePlatform]}: View source” link.
                  </p>

                  <button
                    type="button"
                    onClick={handleImportFromUrl}
                    disabled={!sourceUrl.trim()}
                    className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                  >
                    Save link
                  </button>
                </div>

                {linkSaved && (
                  <p className="text-[11px] text-emerald-700">
                    Link saved. It will appear on your Flip as a clickable source link.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Post Text (reduced height on mobile so button is visible) */}
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 mb-2">Post Text</div>
            <textarea
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                         h-40 sm:h-48"
              placeholder="Paste a post, quote, or hot take that needs to be unpacked…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center rounded-3xl bg-slate-800 px-6 py-4 text-base font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Generate Flip
          </button>

          {/* Tight helper + footer */}
          <div className="text-center space-y-2">
            <p className="text-[12px] text-slate-600">
              Get five alternative perspectives to the original post with a click
            </p>
            <p className="text-[12px] text-slate-500">
              Flipside isn’t here to create another echo chamber. It exists to show us a better way to post.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
