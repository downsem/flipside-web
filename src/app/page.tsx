"use client";

import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, serverTs, ensureUserProfile } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

type SourceType = "original" | "import-self" | "import-other";

type SourcePlatform =
  | "x"
  | "threads"
  | "bluesky"
  | "truth"
  | "reddit"
  | "other";

export default function AddPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<SourceType>("original");

  const router = useRouter();
  const isSignedIn = !!auth.currentUser;

  function handleSourceTypeChange(e: ChangeEvent<HTMLInputElement>) {
    setSourceType(e.target.value as SourceType);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    setError(null);

    try {
      const user = auth.currentUser;

      // If signed in, persist post
      if (user) {
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
        });

        await fetch("/api/flip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: postRef.id,
            text: text.trim(),
          }),
        });
      } else {
        // Anonymous preview flow (no persistence)
        await fetch("/api/flip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
          }),
        });
      }

      router.push("/feed");
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !busy;

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        <header className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              Add Flip
            </h1>
            <Link
              href="/feed"
              className="text-sm font-medium text-slate-800 underline"
            >
              Explore more flips →
            </Link>
          </div>

          {/* NEW subheader */}
          <p className="text-sm text-slate-500">
            Find new sides to every post
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source selector */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">What are you flipping?</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
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

          {error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-slate-700 px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            Generate Flip
          </button>

          {/* NEW sign-up blurb */}
          {!isSignedIn && (
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
