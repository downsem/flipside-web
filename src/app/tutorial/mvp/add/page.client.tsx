"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoAuthor, generateMockRewrites } from "@/tutorial/mvp/mock";
import { saveMvpTutorialState } from "@/tutorial/mvp/storage";

type SourceType = "original" | "import-self" | "import-other";

export default function AddMvpTutorialClient() {
  const router = useRouter();
  const [text, setText] = useState(
    "DC should expand protected bike lanes, even if it means fewer parking spaces."
  );
  const [sourceType, setSourceType] = useState<SourceType>("original");
  const [sourceUrl, setSourceUrl] = useState("");

  const canGenerate = useMemo(() => text.trim().length > 0, [text]);

  function generate() {
    if (!canGenerate) return;
    const post = {
      id: "tutorial_post_1",
      text: text.trim(),
      createdAt: Date.now(),
      author: demoAuthor(),
      sourceType,
      sourceUrl: sourceType === "original" ? null : sourceUrl.trim() || null,
    };
    const rewrites = generateMockRewrites(post.text);
    saveMvpTutorialState({ post, rewrites });
    router.push("/tutorial/mvp/feed");
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-6 bg-slate-50">
      <div className="w-full max-w-xl space-y-4">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">MVP Tutorial</h1>
            <div className="flex items-center gap-3">
              <Link href="/tutorial" className="text-sm font-medium text-slate-800 underline">
                Tutorial home
              </Link>
              <Link href="/" className="text-sm font-medium text-slate-800 underline">
                Back to real Add Flip
              </Link>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Step 1/2: Write a post and generate your demo Flip. (This is a sandbox — nothing is saved.)
          </p>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">What are you flipping?</div>

          <div className="mt-3 space-y-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="sourceType"
                value="original"
                checked={sourceType === "original"}
                onChange={() => setSourceType("original")}
              />
              <span>Original thought or post</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="sourceType"
                value="import-self"
                checked={sourceType === "import-self"}
                onChange={() => setSourceType("import-self")}
              />
              <span>My post from another platform</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="sourceType"
                value="import-other"
                checked={sourceType === "import-other"}
                onChange={() => setSourceType("import-other")}
              />
              <span>Someone else&apos;s public post</span>
            </label>
          </div>

          {sourceType !== "original" && (
            <div className="mt-3">
              <input
                type="url"
                placeholder="Original post link (optional)"
                className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
          )}

          <div className="mt-4 rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <textarea
              className="h-40 w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Paste a post, quote, or hot take that needs to be unpacked..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Tip: in the real MVP, Flips are generated and stored in Firestore.
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            >
              Generate demo Flip →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
