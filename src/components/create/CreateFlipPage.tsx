"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mode] = useState<FlipMode>("ai");
  const [progressMessage, setProgressMessage] = useState("");
  const submitLockRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!busy) {
      setProgressMessage("");
      return;
    }

    setProgressMessage("Analyzing your post...");
    const generatingTimer = window.setTimeout(
      () => setProgressMessage("Generating perspectives..."),
      2500
    );
    const rankingTimer = window.setTimeout(
      () => setProgressMessage("Ranking the strongest versions..."),
      7000
    );
    const slowTimer = window.setTimeout(
      () => setProgressMessage("This is taking a little longer than usual. We’re still working on it."),
      14000
    );

    return () => {
      window.clearTimeout(generatingTimer);
      window.clearTimeout(rankingTimer);
      window.clearTimeout(slowTimer);
    };
  }, [busy]);

  useEffect(() => {
    if (!busy) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [busy]);

  async function handleImport() {
    const normalizedUrl = normalizeUrl(importUrl);
    if (!normalizedUrl) {
      setError("Paste a public post URL first.");
      return;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError("That link doesn't look valid. Please paste a full URL.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/import-social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok || typeof json?.text !== "string" || !json.text.trim()) {
        const message =
          typeof json?.error?.message === "string"
            ? json.error.message
            : typeof json?.error === "string"
              ? json.error
              : "We couldn't import text from that post. Check that it is public and try again.";
        setError(message);
        return;
      }

      const canonicalUrl =
        typeof json.sourceUrl === "string" && json.sourceUrl.trim()
          ? normalizeUrl(json.sourceUrl)
          : normalizedUrl;

      setText(json.text.trim());
      setSourceUrl(canonicalUrl);
      setSourcePlatform(
        typeof json.platform === "string" && json.platform.trim()
          ? json.platform
          : detectPlatform(canonicalUrl)
      );
      setImportUrl("");
      setShowImport(false);
      setIsImported(true);
    } catch (importError) {
      console.error("Error importing social post:", importError);
      setError("We couldn't import that post. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  function cancelImport() {
    setImportUrl("");
    setShowImport(false);
    setError(null);
  }

  function replaceImportedPost() {
    if (busy || importing) return;
    setText("");
    setSourceUrl("");
    setSourcePlatform(null);
    setImportUrl("");
    setIsImported(false);
    setShowImport(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy || submitLockRef.current) return;

    submitLockRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const finalSourceUrl = isImported && sourceUrl.trim() ? sourceUrl.trim() : null;
      const sourceType: SourceType = finalSourceUrl ? "import-other" : "original";
      const finalSourcePlatform = finalSourceUrl
        ? sourcePlatform || detectPlatform(finalSourceUrl)
        : null;

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
        sourcePlatform: finalSourcePlatform,
        authorIsAnonymous: !!u?.isAnonymous,
        flipType: mode,
        status: mode === "people" ? "draft" : "published",
      });

      if (mode === "ai") {
        const idToken = await u.getIdToken();
        const res = await fetch("/api/flip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            postId: postRef.id,
            text: text.trim(),
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          const apiMessage =
            typeof json?.error?.message === "string"
              ? json.error.message
              : typeof json?.error === "string"
                ? json.error
                : null;
          const message =
            apiMessage || "The perspectives could not be generated. Please try again.";
          console.error("Error generating rewrites:", {
            status: res.status,
            code: json?.error?.code,
            response: json,
          });
          setError(message);
          submitLockRef.current = false;
          setBusy(false);
          return;
        }

        router.push(`/post/${postRef.id}`);
        return;
      }

      router.push(`/create/match/${postRef.id}`);
    } catch (err) {
      console.error("Error creating flip:", err);
      setError("Something went wrong creating your flip. Please try again.");
      submitLockRef.current = false;
      setBusy(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !busy;
  const showSignInBox = !user || !!user?.isAnonymous;

  return (
    <AppShell title="Create">
      <main className="mx-auto w-full max-w-[680px] px-1 pb-10 pt-4 sm:px-4 sm:pt-6 lg:pt-8">
        <header className="mb-5 text-center sm:mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-[36px] sm:leading-[1.08]">
            Flip a thought. See the other side.
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-neutral-600 sm:text-base">
            Paste or import a social post to instantly explore multiple perspectives.
          </p>
        </header>

        <form id="create-form" onSubmit={handleSubmit} className="space-y-3">
          <section className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5">
            {!isImported && !showImport && (
              <button
                type="button"
                onClick={() => {
                  setShowImport(true);
                  setError(null);
                }}
                disabled={busy}
                className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 transition duration-200 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Import a post
              </button>
            )}

            {showImport && !isImported && (
              <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 transition-all duration-200 sm:p-4">
                <label
                  htmlFor="import-post-url"
                  className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  Paste a post URL
                </label>
                <input
                  id="import-post-url"
                  type="url"
                  value={importUrl}
                  onChange={(event) => setImportUrl(event.target.value)}
                  placeholder="https://..."
                  disabled={busy || importing}
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition duration-200 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={cancelImport}
                    disabled={busy || importing}
                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={busy || importing || !importUrl.trim()}
                    className="rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {importing ? "Importing…" : "Import"}
                  </button>
                </div>
              </div>
            )}

            <textarea
              className={[
                "min-h-[120px] w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-base leading-6 text-neutral-950 placeholder:text-neutral-400 focus:outline-none disabled:opacity-70 sm:min-h-[140px]",
                isImported ? "cursor-default" : "",
              ].join(" ")}
              placeholder="What thought do you want to flip?"
              value={text}
              onChange={(e) => {
                if (!isImported) setText(e.target.value);
              }}
              readOnly={isImported}
              disabled={busy}
              aria-readonly={isImported}
            />

            {isImported && (
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  onClick={replaceImportedPost}
                  disabled={busy || importing}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition duration-200 hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Replace imported post
                </button>
              </div>
            )}
          </section>

          <Button
            type="submit"
            loading={busy}
            disabled={!canSubmit}
            className="h-12 w-full rounded-2xl text-base font-semibold transition duration-200"
          >
            {busy ? "Creating your Flip" : "Flip it"}
          </Button>

          {busy && progressMessage && (
            <div
              className="rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-neutral-700"
              role="status"
              aria-live="polite"
            >
              {progressMessage}
            </div>
          )}

          {error && (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                type="submit"
                disabled={!text.trim() || busy}
                className="mt-3 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition duration-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Try again
              </button>
            </div>
          )}

          {showSignInBox && (
            <aside className="rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-center sm:px-5">
              <p className="text-sm font-medium leading-6 text-neutral-700">
                Try Flipside without signing in.
              </p>
              <p className="mt-1 text-sm text-neutral-500">Sign in to keep your flips.</p>
              <Link
                href="/account"
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-2 text-sm font-semibold text-neutral-800 transition duration-200 hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            </aside>
          )}
        </form>
      </main>
    </AppShell>
  );
}
