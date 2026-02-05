"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrototypeDeckCard } from "@/components/PrototypeDeckCard";
import { usePrototypeStore } from "@/prototype/people/store";

export default function PrototypePageClient() {
  const searchParams = useSearchParams();
  const publishedOnly = searchParams.get("published") === "1";

  const seedIfNeeded = usePrototypeStore((s) => s.seedIfNeeded);

  useEffect(() => {
    seedIfNeeded();
  }, [seedIfNeeded]);

  const peopleDecks = usePrototypeStore((s) => s.peopleDecks);

  const decks = useMemo(() => {
    // Right now, our prototype store only contains published decks.
    // If we add drafts later, we can merge them here.
    const base = publishedOnly ? peopleDecks : peopleDecks;
    // newest first
    return [...base].sort((a: any, b: any) =>
      (b.publishedAt ?? b.createdAt ?? 0) - (a.publishedAt ?? a.createdAt ?? 0)
    );
  }, [publishedOnly, peopleDecks]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Prototype</div>
            <h1 className="text-2xl font-semibold text-slate-900">Prototype Feed</h1>
            <div className="text-sm text-slate-600">People decks (AI not mocked here)</div>
          </div>

          <Link
            href="/prototype/create"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add Flip
          </Link>
        </header>

        <div className="space-y-6">
          {decks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
              No decks yet.
            </div>
          ) : (
            decks.map((deck: any) => <PrototypeDeckCard key={deck.id} deck={deck} />)
          )}
        </div>
      </div>
    </div>
  );
}
