"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, serverTs, ensureUserProfile } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";

type SourceType = "original" | "import-self" | "import-other";

type SourcePlatform = "x" | "threads" | "bluesky" | "truth" | "reddit" | "other";

// Simple label map just for the helper text
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

  function handleSourceTypeChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value as SourceType;
    setSourceType(value);
  }

  // NEW: just mark that we’ve captured the link; no scraping/import
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

    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to create a flip.");
      return;
    }

    // Keep existing requirement for imported posts (no behavior changes)
    if (isImported && !sourceUrl.trim()) {
      setError("Please include a link to the original post or page.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await ensureUserProfile(user);

      const postsCol = collection(db, "posts");
      const postRef = doc(postsCol);

      await setDoc(postRef, {
        id: postRef.id,
        text: text.trim(),
        authorId: user.uid,
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
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header / Landing messaging */}
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                There’s another side to see every post
              </h1>
              <p className="text-sm text-slate-600">
                Drop in post below and Flipside will show you some alternative
                angles
              </p>
            </div>

            <Link
              href="/"
              className="shrink-0 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-[11px] font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Explore more flips →
            </Link>
          </div>

          {auth.currentUser && (
            <p className="text-[11px] text-slate-500">
              Posting as{" "}
              <span className="font-medium">
                {auth.currentUser.displayName || auth.currentUser.email}
              </span>
            </p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source type selector */}
          <div className="space-y-2 text-[11px] text-slate-800">
            <p className="font-medium">What are you flipping?</p>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="original"
                  checked={sourceType === "original"}
                  onChange={handleSourceTypeChange}
                />
                <span>Original thought or post</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-self"
                  checked={sourceType === "import-self"}
                  onChange={handleSourceTypeChange}
                />
                <span>My post from another platform</span>
              </label>
              <label className="inline-flex items-center gap-2">
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

          {/* Imported metadata fields */}
          {isImported && (
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-3 text-[11px]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-slate-800">
                    Original post link (optional)
                  </p>
                  <p className="text-slate-500">
                    Paste the link to the original post here for context (just
                    an option but, start with the text if that’s easier)
                  </p>
                </div>

                {/* Keep platform selector as-is (no behavior changes) */}
                <select
                  value={sourcePlatform}
                  onChange={(e) =>
                    setSourcePlatform(e.target.value as SourcePlatform)
                  }
                  className="mt-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="x">X</option>
                  <option value="threads">Threads</option>
                  <option value="bluesky">Bluesky</option>
                  <option value="truth">Truth Social</option>
                  <option value="reddit">Reddit</option>
                  <option value="other">Other / Website</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  className="font-medium text-slate-800"
                  htmlFor="sourceUrl"
                >
                  Original post link (optional)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="sourceUrl"
                    type="url"
                    placeholder="Paste the link to the original post here for context (just an option but, start with the text if that’s easier)"
                    className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={sourceUrl}
                    onChange={(e) => {
                      setSourceUrl(e.target.value);
                      setLinkSaved(false);
                    }}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={handleImportFromUrl}
                    disabled={!sourceUrl.trim()}
                    className="whitespace-nowrap rounded-2xl bg-slate-900 px-4 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                  >
                    Import from link
                  </button>
                </div>

                <p className="mt-2 text-[10px] text-slate-500">
                  We’ll show this as a small “{PLATFORM_LABEL[sourcePlatform]}:
                  View source” link on your Flip card. You&apos;re responsible
                  for how you quote and share content.
                </p>

                {linkSaved && (
                  <p className="mt-1 text-[10px] text-emerald-700">
                    Link saved. It will appear on your Flip as a clickable source
                    link.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main flip text */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-800">
              Post Text
            </label>

            <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <textarea
                className="h-44 w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                placeholder="Paste a post, quote, or hot take that needs to be unpacked…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50 hover:bg-slate-800"
            >
              Generate Flip
            </button>

            <p className="text-center text-[11px] text-slate-600">
              Get five alternative perspectives to the original post with a
              click
            </p>
          </div>
        </form>

        {/* Footer positioning / mission line */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-600">
            Flipside isn’t here to create another echo chamber. It exists to
            show us a better way to post.
          </p>
        </div>
      </div>
    </div>
  );
}
