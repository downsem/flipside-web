// src/app/prototype/rooms/[roomId]/page.client.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
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

  // Prototype-only: keep identity simple and remove the extra "Name" UI.
  // Later, swap this to auth displayName once Rooms are persisted.
  const name = "You";
  const normalizedName = "you";

  if (!room) {
    return (
      <AppShell
        title="Room"
        headerLeft={
          <Link href="/prototype">
            <Button size="sm" variant="ghost">
              Back
            </Button>
          </Link>
        }
      >
        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-5">
          <div className="text-base font-semibold text-neutral-900">Room not found</div>
          <p className="mt-2 text-sm text-neutral-600">
            This Room may have been cleared from local storage.
          </p>
          <div className="mt-4">
            <Link href="/prototype" className="text-sm underline text-neutral-700">
              Back to People Mode
            </Link>
          </div>
        </div>
      </AppShell>
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
    <AppShell
      title={room.title}
      headerLeft={
        <Link href="/prototype">
          <Button size="sm" variant="ghost">
            Back
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-neutral-600">
          Seed + chat are message-numbered for citations.
        </div>

        {/* Tabs */}
        <div className="flex rounded-[var(--radius-card)] border border-neutral-200 bg-white overflow-hidden">
          {(["chat", "solution"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2 text-sm flex-1",
                tab === t ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              )}
            >
              {t === "chat" ? "Chat" : "AI Solution (stub)"}
            </button>
          ))}
        </div>

        {/* Chat */}
        {tab === "chat" && (
          <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[60dvh] sm:h-[420px] overflow-auto px-1 py-2"
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
                    // Keep it feeling like a chat (bubbles), not nested cards.
                    "max-w-[88%] sm:max-w-[780px] rounded-[22px] px-4 py-3",
                    isSeed
                      ? "bg-white border border-neutral-200"
                      : isYou
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-900"
                  );

                  const seedTintWrap = isSeed
                    ? "bg-neutral-50/70"
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
                              ? "border-neutral-700 bg-neutral-800 text-white"
                              : "border-neutral-200 bg-white text-neutral-700"
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
                              isYou ? "text-neutral-200" : "text-neutral-500"
                            )}
                          >
                            <div className="text-xs">
                              <span className={isYou ? "text-neutral-200" : ""}>
                                <span
                                  className={clsx(
                                    "font-medium",
                                    isYou ? "text-neutral-100" : "text-neutral-700"
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
                              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                starter
                              </span>
                            )}
                          </div>

                          <div className={seedTintWrap}>
                            <div
                              className={clsx(
                                "whitespace-pre-wrap text-[15px] leading-relaxed",
                                isYou ? "text-white" : "text-neutral-900"
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
                className="flex-1 rounded-[var(--radius-card)] border border-neutral-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                onClick={send}
                className="rounded-[var(--radius-card)] bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Solution (stub) */}
        {tab === "solution" && (
          <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-neutral-900">
                Solution article
              </div>
              <button
                disabled
                className="rounded-full bg-neutral-200 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
                title="UI-only for now"
              >
                Generate (coming soon)
              </button>
            </div>

            <div className="text-sm text-neutral-600">
              For now this is UI-only. You can tweak the draft manually to
              simulate iteration.
            </div>

            <textarea
              value={room.solution?.content ?? ""}
              onChange={(e) => setDraftSolution(e.target.value)}
              placeholder="(Draft solution will appear here once generation is wired.)"
              className="w-full min-h-[260px] rounded-[var(--radius-card)] border border-neutral-200 p-4 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            />

            <div className="text-xs text-neutral-500">
              When we wire “guts,” this field will be filled by the
              transcript-only generator and must cite message numbers.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
