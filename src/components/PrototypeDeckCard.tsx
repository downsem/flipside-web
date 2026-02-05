"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import PeopleDeckSwipe from "@/components/PeopleDeckSwipe";
import type { PeopleDeckPublished } from "@/prototype/people/types";
import { usePrototypeStore } from "@/prototype/people/store";
import { ROOM_SEED_KEY, deckToSnapshot } from "@/prototype/rooms/store";

export function PrototypeDeckCard({ deck }: { deck: PeopleDeckPublished }) {
  const router = useRouter();
  const currentUser = usePrototypeStore((s) => s.currentUser);

  const isOwner = useMemo(() => {
    if (!currentUser) return false;
    // Prototype decks use ownerUserId.
    return (deck as any).ownerUserId === currentUser.id;
  }, [currentUser, deck]);

  function startRoomFromDeck() {
    try {
      const snap = deckToSnapshot(deck);
      sessionStorage.setItem(ROOM_SEED_KEY, JSON.stringify(snap));
    } catch {
      // If sessionStorage fails for some reason, still route to the form.
    }
    router.push("/prototype/rooms/new");
  }

  const ownerName = (deck as any).ownerName ?? currentUser?.name ?? "Unknown";
  const ownerHandle = (deck as any).ownerHandle
    ? `@${(deck as any).ownerHandle}`
    : "";

  const publishedAt = (deck as any).publishedAt ?? (deck as any).createdAt;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900">
              {ownerName}{" "}
              <span className="text-slate-500">{ownerHandle}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Published {new Date(publishedAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={startRoomFromDeck}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              Start Room
            </button>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm">
            People
          </span>
        </div>
      </div>

      <div className="mt-4">
        <PeopleDeckSwipe deck={deck} />
      </div>
    </div>
  );
}
