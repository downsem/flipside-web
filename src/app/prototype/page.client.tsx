"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { PrototypeDeckCard } from "@/components/PrototypeDeckCard";
import { usePrototypeStore } from "@/prototype/people/store";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

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
    <AppShell
      title="People Mode"
      headerRight={
        <div className="flex items-center gap-2">
          <Link href="/prototype/create">
            <Button size="sm" variant="secondary">
              Build
            </Button>
          </Link>
          <Link href="/feed">
            <Button size="sm" variant="ghost">
              Exit
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {decks.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-6 text-neutral-700">
            No decks yet.
          </div>
        ) : (
          decks.map((deck: any) => <PrototypeDeckCard key={deck.id} deck={deck} />)
        )}
      </div>
    </AppShell>
  );
}
