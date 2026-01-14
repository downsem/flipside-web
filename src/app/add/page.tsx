"use client";

import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, serverTs, ensureUserProfile } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";

type SourceType = "original" | "import-self" | "import-other";

type SourcePlatform =
  | "x"
  | "threads"
  | "bluesky"
  | "truth"
  | "reddit"
  | "other";

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
  const [sourcePlatform, setSourcePlatform] =
    useState<SourcePlatform>("x");
  const [sourceUrl, setSourceUrl] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);

  const router = useRouter();
  const isImported = sourceType !== "original";

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

    const user = auth.currentUser;
    if (!user) {
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
        setError("Something went wrong creating your flip. Please try again.");
        setBusy(false);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error(err);
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
      <div className="w-full max-w-xl space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            There’s another side to see every post
          </h1>
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Explore more flips →
          </Link>
        </header>

        <p className="text-sm text-slate-600">
          Drop in a post below and Flipside will show you some alternative angles
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-sm">
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
                Original thought or post
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-self"
                  checked={sourceType === "import-self"}
                  onChange={handleSourceTypeChange}
                />
                My post from another platform
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value="import-other"
                  checked={sourceType === "import-other"}
                  onChange={handleSourceTypeChange}
                />
                Someone else&apos;s public post
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <textarea
              className="h-40 w-full resize-none bg-transparent text-sm focus:outline-none"
              placeholder="Paste a post, quote, or hot take that needs to be unpacked…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-slate-700 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Generate Flip
          </button>

          <p className="text-xs text-center text-slate-500">
            Get five alternative perspectives to the original post with a click
          </p>

          <p className="text-xs text-center text-slate-600">
            Flipside isn’t here to create another echo chamber. It exists to show
            us a better way to post.
          </p>
        </form>
      </div>
    </div>
  );
}
