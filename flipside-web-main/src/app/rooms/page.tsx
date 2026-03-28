import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";

const rooms = [
  {
    id: "dcps-cellphone-ban",
    title: "DCPS Cellphone Ban: Safety vs Access in Schools",
    contributors: [
      "Dr. Maya Reynolds",
      "James Carter",
      "Alicia Gomez",
      "Tyler Brooks",
      "Danielle Kim",
    ],
    summary:
      "DC Public Schools are considering stricter cellphone restrictions to improve focus and safety, but the policy raises concerns around emergency communication, enforcement, and equity.",
  },
  {
    id: "rfk-redevelopment",
    title: "RFK Redevelopment: Growth, Access, and Community Benefit",
    contributors: [
      "Janelle Price",
      "Marcus Hill",
      "Tara Singh",
      "Owen Mercer",
    ],
    summary:
      "Contributors explored how redevelopment can generate economic activity without repeating a pattern where public land is transformed with too little accountability to surrounding communities.",
  },
];

export default function RoomsPage() {
  return (
    <AppShell
      title="Rooms"
      headerRight={<div className="text-[var(--text-sm)] text-neutral-500">Curated expert discussions</div>}
    >
      <div className="space-y-4">
        {rooms.map((room) => (
          <Link key={room.id} href={`/rooms/${room.id}`} className="block">
            <Card className="space-y-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{room.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {room.contributors.length} contributors • Structured discussion
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {room.contributors.map((name) => (
                    <span key={name} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{room.summary}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
