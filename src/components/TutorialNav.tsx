"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TutorialNav() {
  const pathname = usePathname();

  // Only show this nav while user is in People Mode (/prototype/*)
  if (!pathname?.startsWith("/prototype")) return null;

  const isCreate = pathname.startsWith("/prototype/create");
  const isBuilder = pathname.startsWith("/prototype/people-mode");
  const isFeed = pathname === "/prototype" || pathname.startsWith("/prototype?") || pathname.includes("/prototype");

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            People Mode (prototype)
          </span>
          <span className="text-xs text-slate-500">
            Placeholder data · end-to-end flow
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/prototype/create"
            className={`rounded-full px-3 py-1 ${
              isCreate ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Home
          </Link>

          <Link
            href="/prototype/people-mode"
            className={`rounded-full px-3 py-1 ${
              isBuilder ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Build
          </Link>

          <Link
            href="/prototype?published=1"
            className={`rounded-full px-3 py-1 ${
              isFeed ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Feed
          </Link>

          <span className="h-5 w-px bg-slate-200" />

          <Link href="/feed" className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-50">
            Exit People Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
