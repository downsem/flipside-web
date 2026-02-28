// src/app/prototype/rooms/[roomId]/page.client.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  addChatMessage,
  getRoom,
  upsertRoom,
  type Room,
} from "@/prototype/rooms/store";

type Tab = "chat" | "solution";

function initials(name: string) {
  const parts = (name || "U").trim().split(/\s+/).slice(0, 2);
  return (
    parts.map((p) => p?.[0]?.toUpperCase() ?? "").join("") ||
    (name?.[0]?.toUpperCase() ?? "U")
  );
}

/**
 * Removes “(Responding to: …)” lines from seed content *at render time*.
 * This keeps stored transcript intact while cleaning up the UI.
 */
function stripRespondingTo(text: string) {
  if (!text) return text;

  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const s = line.trim();

    // Matches:
    // (Responding to: Something)
    // Responding to: Something
    // (Responding to: Something) with leading whitespace
    return !/^\(?responding to:/i.test(s);
  });

  return filtered.join("\n").trim();
}

export default function RoomClient({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [name, setName] = useState("You");
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRoom(getRoom(roomId));
  }, [roomId]);

  // auto-scroll to bottom when messages change
  useEffect(() => {
    if (!room) return;
    // allow paint first
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
    return () => clearTimeout(t);
  }, [room?.messages?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function refresh() {
    setRoom(getRoom(roomId));
  }

  const normalizedName = useMemo(() => name.trim().toLowerCase(), [name]);

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">
            Room not found
          </div>
          <p className="mt-2 text-sm text-slate-600">
            This Room may have been cleared from local storage.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/people" className="text-sm underline text-slate-700">
              Tutorial Home
            </Link>
            <Link href="/feed" className="text-sm underline text-slate-700">
              MVP Feed
            </Link>
            <Link href="/" className="text-sm underline text-slate-700">
              MVP Add Flip
            </Link>
            <Link
              href="/prototype/rooms"
              className="text-sm underline text-slate-700"
            >
              Back to Rooms
            </Link>
            <Link
              href="/prototype/people-mode"
              className="text-sm underline text-slate-700"
            >
              Build a deck
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed) return;

    addChatMessage(room.id, { authorName: name, content: trimmed });
    setInput("");
    refresh();
  }

  function setDraftSolution(text: string) {
    const next = { ...room };
    next.solution = {
      status: "draft",
      content: text,
      createdAt: Date.now(),
    };
    upsertRoom(next);
    refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Prototype · Room</div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {room.title}
            </h1>
            <div className="mt-1 text-xs text-slate-500">
              Seed + chat are message-numbered for citations.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link href="/people" className="text-sm underline text-slate-700">
              Tutorial Home
            </Link>
            <Link href="/feed" className="text-sm underline text-slate-700">
              MVP Feed
            </Link>
            <Link href="/" className="text-sm underline text-slate-700">
              MVP Add Flip
            </Link>
            <Link
              href="/prototype/rooms"
              className="text-sm underline text-slate-700"
            >
              Back to Rooms
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {(["chat", "solution"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2 text-sm flex-1",
                tab === t ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
              )}
            >
              {t === "chat" ? "Chat" : "AI Solution (stub)"}
            </button>
          ))}
        </div>

        {/* Chat */}
        {tab === "chat" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-44 rounded-full border border-slate-200 px-3 py-2 text-sm"
                placeholder="Your name"
              />
              <div className="text-xs text-slate-500">
                (Prototype only — no auth yet)
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4"
            >
              <div className="space-y-3">
                {room.messages.map((m, i) => {
                  const authorNorm = (m.authorName || "").trim().toLowerCase();
                  const isYou =
                    authorNorm === normalizedName || authorNorm === "you";
                  const isSeed = m.kind === "seed";

                  const rowJustify = isYou ? "justify-end" : "justify-start";
                  const rowDirection = isYou ? "flex-row-reverse" : "flex-row";

                  const bubbleClass = clsx(
                    "max-w-[780px] w-full rounded-2xl border px-4 py-3 shadow-sm",
                    isSeed
                      ? "bg-white border-slate-200"
                      : isYou
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200"
                  );

                  const seedTintWrap = isSeed
                    ? "bg-slate-50/60"
                    : "bg-transparent";

                  const displayContent = isSeed
                    ? stripRespondingTo(m.content)
                    : m.content;

                  return (
                    <div key={m.id} className={`flex ${rowJustify}`}>
                      <div
                        className={clsx(
                          "flex items-end gap-3 w-full",
                          rowDirection
                        )}
                      >
                        {/* Avatar */}
                        <div
                          className={clsx(
                            "h-9 w-9 shrink-0 rounded-full border flex items-center justify-center text-xs font-semibold",
                            isYou
                              ? "border-slate-700 bg-slate-800 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          )}
                          title={m.authorName}
                        >
                          {initials(m.authorName)}
                        </div>

                        {/* Bubble */}
                        <div className={bubbleClass}>
                          <div
                            className={clsx(
                              "flex items-center justify-between gap-3 mb-1",
                              isYou ? "text-slate-200" : "text-slate-500"
                            )}
                          >
                            <div className="text-xs">
                              <span className={isYou ? "text-slate-200" : ""}>
                                <span
                                  className={clsx(
                                    "font-medium",
                                    isYou ? "text-slate-100" : "text-slate-700"
                                  )}
                                >
                                  [{i + 1}]
                                </span>{" "}
                                {isSeed
                                  ? `Seed${m.lens ? ` (${m.lens})` : ""}`
                                  : "Chat"}{" "}
                                — {m.authorName}
                              </span>
                            </div>

                            {isSeed && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                starter
                              </span>
                            )}
                          </div>

                          <div className={seedTintWrap}>
                            <div
                              className={clsx(
                                "whitespace-pre-wrap text-sm",
                                isYou ? "text-white" : "text-slate-900"
                              )}
                            >
                              {displayContent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Composer */}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="React to the seed flips, ask a question, or propose a next step…"
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                onClick={send}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Solution (stub) */}
        {tab === "solution" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">
                Solution article
              </div>
              <button
                disabled
                className="rounded-full bg-slate-200 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                title="UI-only for now"
              >
                Generate (coming soon)
              </button>
            </div>

            <div className="text-sm text-slate-600">
              For now this is UI-only. You can tweak the draft manually to
              simulate iteration.
            </div>

            <textarea
              value={room.solution?.content ?? ""}
              onChange={(e) => setDraftSolution(e.target.value)}
              placeholder="(Draft solution will appear here once generation is wired.)"
              className="w-full min-h-[260px] rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />

            <div className="text-xs text-slate-500">
              When we wire “guts,” this field will be filled by the
              transcript-only generator and must cite message numbers.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
