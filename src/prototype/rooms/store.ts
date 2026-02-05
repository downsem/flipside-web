// src/prototype/rooms/store.ts
import type { TimelineId } from "@/theme/timelines";

export const ROOM_SEED_KEY = "fs_room_seed_deck_v0";
const ROOMS_KEY = "fs_rooms_v0";

const ORDER: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

export type SeedLens = "anchor" | TimelineId;

export type SeedPost = {
  id: string;
  lens: SeedLens;
  text: string;
  author: { name: string; handle?: string };
  sourceType?: string;
};

export type RoomMessage = {
  id: string;
  kind: "seed" | "chat";
  lens?: SeedLens;
  authorName: string;
  content: string;
  createdAt: number; // ms
};

export type DeckSnapshot = {
  anchor: SeedPost;
  matches: Record<TimelineId, SeedPost>;
};

export type Room = {
  id: string;
  title: string;
  createdAt: number;
  deck: DeckSnapshot;
  messages: RoomMessage[]; // includes seed messages first
  solution?: {
    status: "draft" | "complete";
    content: string;
    createdAt: number;
  };
};

function uid(prefix = "r") {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 10)}${Date.now().toString(36)}`;
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function loadRooms(): Room[] {
  if (typeof window === "undefined") return [];
  return safeJsonParse<Room[]>(localStorage.getItem(ROOMS_KEY)) ?? [];
}

function saveRooms(list: Room[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROOMS_KEY, JSON.stringify(list));
}

export function listRooms(): Room[] {
  return loadRooms().sort((a, b) => b.createdAt - a.createdAt);
}

export function getRoom(roomId: string): Room | null {
  return loadRooms().find((r) => r.id === roomId) ?? null;
}

export function upsertRoom(room: Room) {
  const list = loadRooms();
  const idx = list.findIndex((r) => r.id === room.id);
  if (idx >= 0) list[idx] = room;
  else list.unshift(room);
  saveRooms(list);
}

export function deleteRoom(roomId: string) {
  const list = loadRooms().filter((r) => r.id !== roomId);
  saveRooms(list);
}

/**
 * Converts the People Mode deck object (draft or published) into a stable snapshot.
 * We keep this very defensive so it works with whatever your current People store returns.
 *
 * Supported shapes:
 * - Current People prototype store: { anchor, locked }
 * - Feed/UI shape: { anchor, matches } (matches contains lens posts)
 * - Draft: { anchorText, locked }
 * - Legacy: { lockedByLens, candidatesByLens }
 */
export function deckToSnapshot(rawDeck: any): DeckSnapshot {
  const anchorRaw =
    rawDeck?.anchor ??
    (rawDeck?.anchorText
      ? {
          id: "anchor",
          text: rawDeck.anchorText,
          author: { name: "Unknown", handle: "" },
          sourceType: "original",
        }
      : rawDeck?.anchorRaw);

  const anchorAuthorName =
    anchorRaw?.author?.name ??
    anchorRaw?.authorDisplayName ??
    rawDeck?.ownerName ??
    "Unknown";

  const anchorAuthorHandle =
    anchorRaw?.author?.handle ??
    anchorRaw?.authorHandle ??
    rawDeck?.ownerHandle ??
    "";

  const anchor: SeedPost = {
    id: anchorRaw?.id ?? "anchor",
    lens: "anchor",
    text: anchorRaw?.text ?? rawDeck?.anchorText ?? "(Missing anchor text)",
    author: {
      name: anchorAuthorName,
      handle: anchorAuthorHandle,
    },
    sourceType: anchorRaw?.sourceType ?? rawDeck?.sourceType ?? "",
  };

  const matches = {} as Record<TimelineId, SeedPost>;

  ORDER.forEach((lens) => {
    // 1) Prefer "locked" (current People prototype store)
    const lockedObj = rawDeck?.locked?.[lens];
    if (lockedObj?.text) {
      matches[lens] = {
        id: lockedObj?.id ?? `${lens}_locked`,
        lens,
        text: lockedObj.text,
        author: {
          name:
            lockedObj?.author?.name ??
            lockedObj?.authorDisplayName ??
            "Unknown",
          handle:
            lockedObj?.author?.handle ?? lockedObj?.authorHandle ?? "",
        },
        sourceType: lockedObj?.sourceType ?? "",
      };
      return;
    }

    // 2) Next: "matches" (feed/UI shape)
    const matchObj = rawDeck?.matches?.[lens];
    if (matchObj?.text) {
      matches[lens] = {
        id: matchObj?.id ?? `${lens}_match`,
        lens,
        text: matchObj.text,
        author: {
          name:
            matchObj?.author?.name ??
            matchObj?.authorDisplayName ??
            "Unknown",
          handle:
            matchObj?.author?.handle ?? matchObj?.authorHandle ?? "",
        },
        sourceType: matchObj?.sourceType ?? "",
      };
      return;
    }

    // 3) Legacy: lockedByLens + candidatesByLens
    const lockedId = rawDeck?.lockedByLens?.[lens]?.postId;
    const pool: any[] = rawDeck?.candidatesByLens?.[lens] ?? [];
    const found = lockedId ? pool.find((p) => p?.id === lockedId) : null;

    matches[lens] = {
      id: found?.id ?? lockedId ?? `${lens}_missing`,
      lens,
      text: found?.text ?? "(Missing matched post text)",
      author: {
        name:
          found?.author?.name ?? found?.authorDisplayName ?? "Unknown",
        handle:
          found?.author?.handle ?? found?.authorHandle ?? "",
      },
      sourceType: found?.sourceType ?? "",
    };
  });

  return { anchor, matches };
}

export function createRoomFromDeck(params: {
  title: string;
  rawDeck: any;
}): Room {
  const deck = deckToSnapshot(params.rawDeck);

  const now = Date.now();
  const roomId = uid("room");

  const seedMessages: RoomMessage[] = [
    {
      id: uid("m"),
      kind: "seed",
      lens: "anchor",
      authorName: `${deck.anchor.author.name}${
        deck.anchor.author.handle ? ` ${deck.anchor.author.handle}` : ""
      }`,
      content: deck.anchor.text,
      createdAt: now,
    },
    ...ORDER.map((lens) => {
      const p = deck.matches[lens];
      return {
        id: uid("m"),
        kind: "seed" as const,
        lens,
        authorName: `${p.author.name}${p.author.handle ? ` ${p.author.handle}` : ""}`,
        content: p.text,
        createdAt: now,
      };
    }),
  ];

  const room: Room = {
    id: roomId,
    title: params.title.trim() || "Untitled Room",
    createdAt: now,
    deck,
    messages: seedMessages,
    solution: {
      status: "draft",
      content: "",
      createdAt: now,
    },
  };

  upsertRoom(room);
  return room;
}

export function addChatMessage(
  roomId: string,
  params: { authorName: string; content: string }
) {
  const room = getRoom(roomId);
  if (!room) return;

  room.messages.push({
    id: uid("m"),
    kind: "chat",
    authorName: params.authorName.trim() || "User",
    content: params.content,
    createdAt: Date.now(),
  });

  upsertRoom(room);
}

export function buildSolutionPrompt(room: Room): string {
  // Number EVERYTHING (seed + chat) so citations can reference [#]
  const numbered = room.messages.map((m, i) => {
    const label =
      m.kind === "seed" ? `Seed${m.lens ? ` (${m.lens})` : ""}` : "Chat";
    return `[${i + 1}] ${label} — ${m.authorName}: ${m.content}`;
  });

  return `
You are a transcript-bound solution composer.

NON-NEGOTIABLE RULES
- You may ONLY use content inside <transcript> ... </transcript>.
- Do NOT add, assume, infer, research, or introduce any context not literally present.
- If something is missing, say "Not stated in chat."
- Write in a blended voice that matches the room's participants.
- Every concrete claim/step must include citations like [3] or [2,7].
- Output must be a single, fluid ARTICLE in Markdown (not bullet-only).

PROBLEM (Room title)
${room.title}

<transcript>
${numbered.join("\n")}
</transcript>

OUTPUT — write ONLY the article in Markdown:

# {Short, compelling title aligned with the room’s phrasing}

*Lede (2–4 sentences):* Frame the problem and solution using only transcript content [#].

## The Case for This Approach
Explain why the solution fits the problem, grounded in seed + chat [#].

## The Plan
Concrete actions (who/what/when/how). Cite each step [#].

## Risks & Unknowns
Name risks or gaps; use "Not stated in chat" when needed [# if applicable].

## Expected Outcomes / Measures
Only if discussed; otherwise “Not stated in chat.”

———
**Provenance:** List the message numbers you used overall (e.g., used [1,2,7,9]).
`.trim();
}
