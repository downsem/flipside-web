import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";

const decks = [
  {
    id: "people-deck-1",
    title: "How should DC handle public safety and civil liberties at the same time?",
    label: "People",
    contributors: ["Tia", "Mark", "Sam", "Leah"],
  },
  {
    id: "ai-deck-1",
    title: "What does a compromise approach to school cellphone policy look like?",
    label: "AI",
    contributors: ["You"],
  },
];

export default function PeoplePage() {
  return (
    <AppShell
      title="People"
      headerRight={
        <Link href="/create" className="text-[var(--text-sm)] underline">
          Create
        </Link>
      }
    >
      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">Collaborative decks</h2>
          <p className="text-sm text-slate-600">
            People mode stays as the collaborative layer of FlipSide. Users can still build decks with others, while Rooms remain the curated public-facing product.
          </p>
        </Card>

        {decks.map((deck) => (
          <Card key={deck.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {deck.label}
              </span>
              <span className="text-xs text-slate-500">{deck.contributors.length} contributors</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">{deck.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {deck.contributors.map((name) => (
                <span key={name} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1">
                  {name}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
