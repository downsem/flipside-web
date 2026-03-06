"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PrototypeDeckCard } from "@/components/PrototypeDeckCard";
import { usePrototypeStore } from "@/prototype/people/store";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import Link from "next/link";


const PEOPLE_MODE_INTRO_SEEN_KEY = "fs_people_mode_intro_seen_v1";

export default function PrototypePageClient() {
  const searchParams = useSearchParams();
  const publishedOnly = searchParams.get("published") === "1";
  const [showIntro, setShowIntro] = useState(false);

  const seedIfNeeded = usePrototypeStore((s) => s.seedIfNeeded);

  useEffect(() => {
    seedIfNeeded();
  }, [seedIfNeeded]);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(PEOPLE_MODE_INTRO_SEEN_KEY) === "1";
      if (!seen) setShowIntro(true);
    } catch {
      // no-op
    }
  }, []);

  const closeIntro = () => {
    setShowIntro(false);
    try {
      window.localStorage.setItem(PEOPLE_MODE_INTRO_SEEN_KEY, "1");
    } catch {
      // no-op
    }
  };

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
      <Sheet open={showIntro} onClose={closeIntro} title="Welcome to People Mode (Prototype)">
        <div className="space-y-4 text-sm text-neutral-700">
          <p>
            People Mode is the human side of FlipSide. Instead of reading only AI rewrites, you build and explore
            decks made from real posts matched across five lenses: Calm, Bridge, Cynical, Opposite, and Playful.
          </p>
          <p>
            This is a prototype and currently uses demo data. The goal is to test the flow: browse decks, build a
            deck, publish it, and start a Room to discuss the topic and develop ideas together.
          </p>
          <p>
            Tap <span className="font-medium text-neutral-900">Build</span> to make a deck, or open any deck to
            explore and join the conversation.
          </p>
          <div className="pt-1">
            <Button onClick={closeIntro} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      </Sheet>

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
