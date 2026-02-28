// src/app/prototype/rooms/page.client.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listRooms, ROOM_SEED_KEY } from "@/prototype/rooms/store";

export default function RoomsClient() {
  const [rooms, setRooms] = useState(listRooms());

  useEffect(() => {
    setRooms(listRooms());
  }, []);

  const hasSeed =
    typeof window !== "undefined" && !!sessionStorage.getItem(ROOM_SEED_KEY);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Prototype</div>
            <h1 className="text-2xl font-semibold text-slate-900">Rooms</h1>
            <p className="text-sm text-slate-600 mt-1">
              UI-only Backroom flow inside Flipside.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/people"
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
            >
              Tutorial Home
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
            >
              MVP Feed
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
            >
              MVP Add Flip
            </Link>
            <Link
              href="/prototype/rooms/new"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Create Room
            </Link>
            <Link href="/prototype" className="text-sm underline text-slate-700">
              Back to prototype
            </Link>
          </div>
        </header>

        {hasSeed && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            A completed People Mode deck is ready to convert.
            <Link href="/prototype/rooms/new" className="ml-2 underline">
              Start from that deck →
            </Link>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Recent Rooms</div>

          {!rooms.length && (
            <div className="mt-3 text-sm text-slate-600">
              No Rooms yet. Create one from a completed People Mode deck.
            </div>
          )}

          <div className="mt-4 space-y-3">
            {rooms.map((r) => (
              <Link
                key={r.id}
                href={`/prototype/rooms/${r.id}`}
                className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{r.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
