"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PeopleDeckSwipe from "@/components/PeopleDeckSwipe";
import type { PeopleDeckPublished } from "@/prototype/people/types";
import { usePrototypeStore } from "@/prototype/people/store";
import {
  ROOM_DECK_ID_KEY,
  ROOM_SEED_KEY,
  deckToSnapshot,
  getRoomIdForDeck,
} from "@/prototype/rooms/store";

function normalizeHandle(handle?: string) {
  if (!handle) return "";
  const h = handle.startsWith("@") ? handle.slice(1) : handle;
  return h.trim().toLowerCase();
}

function fmtHandle(handle?: string) {
  if (!handle) return "";
  const h = handle.startsWith("@") ? handle.slice(1) : handle;
  return `@${h}`;
}

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function PrototypeDeckCard({ deck }: { deck: PeopleDeckPublished }) {
  const router = useRouter();
  const currentUser = usePrototypeStore((s) => s.currentUser);

  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    // SSR-safe: getRoomIdForDeck returns null when window is undefined
    setRoomId(getRoomIdForDeck(deck.id));
  }, [deck.id]);

  const isContributor = useMemo(() => {
    if (!currentUser) return false;

    const keys = new Set<string>();

    // deck owner / curator
    if ((deck as any)?.ownerUserId) keys.add((deck as any).ownerUserId);
    const ownerHandle = normalizeHandle((deck as any)?.ownerHandle);
    if (ownerHandle) keys.add(ownerHandle);

    const addUser = (u: any) => {
      if (!u) return;
      if (u.id) keys.add(u.id);
      if (u.uid) keys.add(u.uid);
      if (u.userId) keys.add(u.userId);
      const h = normalizeHandle(u.handle ?? u.username);
      if (h) keys.add(h);
    };

    // anchor author (optional but included for contributor check)
    addUser((deck as any)?.anchor?.author);

    // matched/locked lens authors (calm/bridge/cynical/opposite/playful)
    const locked = (deck as any)?.locked ?? {};
    Object.values(locked).forEach((p: any) => addUser(p?.author));

    const meId = currentUser.id ?? (currentUser as any).uid ?? (currentUser as any).userId;
    const meHandle = normalizeHandle(currentUser.handle);

    return (meId ? keys.has(meId) : false) || (meHandle ? keys.has(meHandle) : false);
  }, [currentUser, deck]);

  // Social proof: highlight *other* contributors instead of the deck builder.
  const contributors = useMemo(() => {
    const ownerId = (deck as any)?.ownerUserId;
    const seen = new Map<string, { id: string; name: string; handle: string }>();

    const add = (u: any) => {
      if (!u) return;
      const id = u.id ?? u.uid ?? u.userId;
      if (!id) return;
      if (ownerId && id === ownerId) return;
      if (seen.has(id)) return;
      seen.set(id, {
        id,
        name: u.name ?? u.displayName ?? "Guest",
        handle: u.handle ?? "",
      });
    };

    try {
      // Include anchor + locked lens authors if they aren't the owner.
      add((deck as any)?.anchor?.author);
      const locked = (deck as any)?.locked ?? {};
      Object.values(locked).forEach((p: any) => add(p?.author));
    } catch {
      // no-op
    }

    return Array.from(seen.values());
  }, [deck]);

  function createRoomFromDeck() {
    try {
      const snap = deckToSnapshot(deck);
      sessionStorage.setItem(ROOM_SEED_KEY, JSON.stringify(snap));
      sessionStorage.setItem(ROOM_DECK_ID_KEY, deck.id);
    } catch {
      // If sessionStorage fails for some reason, still route to the form.
    }
    router.push("/prototype/rooms/new");
  }

  function viewRoom() {
    if (!roomId) return;
    router.push(`/prototype/rooms/${roomId}`);
  }

  const ownerName = (deck as any)?.ownerName ?? currentUser?.name ?? "Guest";
  const ownerHandle = fmtHandle((deck as any)?.ownerHandle ?? currentUser?.handle);
  const publishedAt = (deck as any)?.publishedAt ?? (deck as any)?.createdAt ?? Date.now();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {contributors.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-slate-500 shrink-0">Contributors</div>
              <div className="flex -space-x-2">
                {contributors.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="h-9 w-9 rounded-full border-2 border-white bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold"
                    title={`${c.name} ${fmtHandle(c.handle)}`.trim()}
                  >
                    {initials(c.name)}
                  </div>
                ))}
                {contributors.length > 4 && (
                  <div
                    className="h-9 w-9 rounded-full border-2 border-white bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-semibold"
                    title={`${contributors.length - 4} more contributor${contributors.length - 4 === 1 ? "" : "s"}`}
                  >
                    +{contributors.length - 4}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="font-semibold text-slate-900">
              {ownerName} <span className="text-slate-500">{ownerHandle}</span>
            </div>
          )}

          <div className="mt-1 text-xs text-slate-500">
            Published {new Date(publishedAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!roomId && isContributor && (
            <button
              type="button"
              onClick={createRoomFromDeck}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              Create Room
            </button>
          )}
          {roomId && (
            <button
              type="button"
              onClick={viewRoom}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              View Room
            </button>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm">
            People
          </span>
        </div>
      </div>

      <div className="mt-4">
        <PeopleDeckSwipe deck={deck as any} />
      </div>
    </div>
  );
}
