"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Top nav used ONLY for the People Mode / Backroom prototype area.
 * We keep the filename (TutorialNav) so RootLayout doesn't need to change.
 */
export default function TutorialNav() {
  const pathname = usePathname() || "/";

  // Only render in the prototype section to avoid the "two top nav bars" feel.
  const inPrototype = pathname.startsWith("/prototype");
  if (!inPrototype) return null;

  const isPeopleHome = pathname === "/prototype/create";
  const isPeopleBuilder = pathname.startsWith("/prototype/people-mode");
  const isRooms = pathname.startsWith("/prototype/rooms");

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-900">
            People Mode (prototype)
          </span>
          {isPeopleBuilder && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Matching real perspectives (placeholder data for now)
            </span>
          )}
          {isRooms && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Backroom (prototype)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isPeopleHome && (
            <Link
              href="/prototype/create"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              People Mode Home
            </Link>
          )}

          <Link
            href="/prototype/people-mode"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Build a deck
          </Link>

          <Link
            href="/prototype/rooms"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Rooms
          </Link>

          {/* Exit button only exists inside prototype (because nav is hidden elsewhere) */}
          <Link
            href="/feed"
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
          >
            Exit People Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
