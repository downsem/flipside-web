"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  activateTutorial,
  deactivateTutorial,
  isTutorialActive,
  onTutorialChange,
} from "@/tutorial/mode";

export default function TutorialNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isTutorialActive());
    const off = onTutorialChange(() => setActive(isTutorialActive()));
    return off;
  }, []);

  // Entering /tutorial turns tutorial mode on; it stays on until Exit.
  useEffect(() => {
    if (pathname.startsWith("/tutorial") || pathname.startsWith("/prototype") || pathname.startsWith("/people")) activateTutorial();
  }, [pathname]);

  if (!active) return null;

  const onExit = () => {
    deactivateTutorial();
    router.push("/feed");
  };

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-700 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            People Mode (prototype)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            className="text-xs rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
          >
            MVP Feed
          </Link>
          <Link
            href="/"
            className="text-xs rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
          >
            MVP Add Flip
          </Link>
          <button
            type="button"
            onClick={onExit}
            className="text-xs rounded-full bg-slate-900 text-white px-3 py-1 hover:bg-slate-800"
          >
            Exit People Mode
          </button>
        </div>
      </div>
    </div>
  );
}
