"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

const EXAMPLE_PROMPTS = [
  "Cities should ban cars downtown",
  "Remote work is making people less productive",
  "The Olympics should remove national teams",
];

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

export default function CreatePage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSourceLink, setHasSourceLink] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
      });

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
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      setBusy(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !busy;
  const showSignInBox = !user || !!user?.isAnonymous;
  const trimmedLength = useMemo(() => text.trim().length, [text]);

  return (
    <AppShell
      title="Create"
      headerRight={
        <Link href="/feed" className="text-[var(--text-sm)] underline">
          Feed
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-950">
            See your idea from 5 different perspectives.
          </h1>
          <p className="text-sm leading-5 text-slate-600">
            Paste a thought or post and instantly see how it changes across five lenses.
          </p>
        </section>

        <section className="rounded-[var(--radius-card)] border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <textarea
            className="h-32 w-full resize-none rounded-2xl border-0 bg-transparent px-0 py-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="Paste a thought, opinion, or post..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Start with one clear opinion, claim, or take.</span>
            <span>{trimmedLength > 0 ? `${trimmedLength} chars` : ""}</span>
          </div>
        </section>

        <Button type="submit" loading={busy} disabled={!canSubmit} className="w-full">
          Flip it
        </Button>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Try an example
          </p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setText(prompt)}
                disabled={busy}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
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
                We'll show this link on the Flip so people can trace it back to the source.
              </div>
            </div>
          )}
        </section>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <section className="rounded-[var(--radius-card)] border border-neutral-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setShowHowItWorks((v) => !v)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showHowItWorks}
          >
            <span className="text-sm font-medium text-slate-900">Learn more</span>
            <span className="text-xs text-slate-500">{showHowItWorks ? "Hide" : "How it works"}</span>
          </button>

          {showHowItWorks && (
            <div className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
              <p>
                FlipSide rewrites the same idea across five lenses: Calm, Bridge, Cynical,
                Opposite, and Playful.
              </p>
              <p>
                The goal is to help you pressure-test your first reaction and see the same idea
                from other angles fast.
              </p>
            </div>
          )}
        </section>

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
