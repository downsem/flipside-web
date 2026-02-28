"use client";

import { create } from "zustand";
import type { TimelineId } from "@/theme/timelines";
import type { PrototypeState, MockPost, PeopleDeckPublished } from "./types";
import { buildMockPosts, TOPICS } from "./mockData";

function uid(prefix = "d") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export const usePrototypeStore = create<PrototypeState>((set, get) => ({
  seeded: false,

  currentUser: { id: "u_ethan", name: "Ethan Downs", handle: "ethan" },

  posts: [],

  peopleDraft: null,
  peopleDecks: [],

  // Optional: keep tutorial mode toggles resilient even if UI calls them.
  tutorialMode: false as any,
  activateTutorial: () => set({ tutorialMode: true } as any),
  exitTutorial: () => set({ tutorialMode: false } as any),

  seedIfNeeded: () => {
    const { seeded, currentUser } = get();
    if (seeded) return;

    const posts = buildMockPosts();

    const pick = (topicId: string, lens: TimelineId) =>
      posts.find((p) => p.topicId === topicId && p.lensLabel === lens) ??
      posts.find((p) => p.lensLabel === lens) ??
      posts[0];

    const demoDecks: PeopleDeckPublished[] = TOPICS.map((t, idx) => {
      const anchor =
        posts.find((p) => p.topicId === t.id && !p.lensLabel) ??
        posts.find((p) => p.topicId === t.id) ??
        posts[0];

      const createdAt = Date.now() - (idx + 1) * 1000 * 60 * 60 * 4;

      return {
        id: `deck_demo_${t.id}`,
        ownerUserId: currentUser.id,
        // Provide owner display fields so UI cards can render cleanly.
        ownerName: currentUser.name,
        ownerHandle: `@${currentUser.handle}`,
        createdAt,
        // Published decks show a publishedAt stamp (fallback is createdAt).
        publishedAt: createdAt,
        topicId: t.id,
        anchor: { ...anchor, author: anchor.author ?? currentUser },
        locked: {
          calm: pick(t.id, "calm"),
          bridge: pick(t.id, "bridge"),
          cynical: pick(t.id, "cynical"),
          opposite: pick(t.id, "opposite"),
          playful: pick(t.id, "playful"),
        },
      } as any;
    });

    set({ posts, peopleDecks: demoDecks, seeded: true });
  },

  startPeopleDraft: ({ anchorText, topicId }) => {
    const { currentUser } = get();
    set({
      peopleDraft: {
        id: uid("draft"),
        ownerUserId: currentUser.id,
        ownerName: currentUser.name,
        ownerHandle: `@${currentUser.handle}`,
        anchorText,
        topicId,
        createdAt: Date.now(),
        locked: {},
      } as any,
    });
  },

  clearDraftPeopleDeck: () => {
    set({ peopleDraft: null });
  },

  getCandidatesForDraft: (lens: TimelineId) => {
    const { posts, peopleDraft } = get();
    if (!peopleDraft) return [];
    return posts.filter(
      (p) => p.topicId === peopleDraft.topicId && p.lensLabel === lens
    );
  },

  lockDraftMatch: (lens: TimelineId, postId: string) => {
    const { peopleDraft, posts } = get();
    if (!peopleDraft) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    set({
      peopleDraft: {
        ...peopleDraft,
        locked: {
          ...peopleDraft.locked,
          [lens]: post,
        },
      },
    });
  },

  unlockDraftLens: (lens: TimelineId) => {
    const { peopleDraft } = get();
    if (!peopleDraft) return;

    const nextLocked = { ...peopleDraft.locked };
    delete nextLocked[lens];

    set({
      peopleDraft: {
        ...peopleDraft,
        locked: nextLocked,
      },
    });
  },

  publishDraftPeopleDeck: () => {
    const { peopleDraft, currentUser } = get();
    if (!peopleDraft) return null;

    const required: TimelineId[] = [
      "calm",
      "bridge",
      "cynical",
      "opposite",
      "playful",
    ];
    for (const lens of required) {
      if (!peopleDraft.locked[lens]) return null;
    }

    const now = Date.now();

    const anchor: MockPost = {
      id: uid("anchor"),
      text: peopleDraft.anchorText,
      author: currentUser,
      createdAt: now,
      sourceType: "original",
      topicId: peopleDraft.topicId,
      votes: 0,
      replies: [],
    };

    const published: PeopleDeckPublished = {
      id: uid("deck"),
      ownerUserId: currentUser.id,
      ownerName: currentUser.name,
      ownerHandle: `@${currentUser.handle}`,
      createdAt: now,
      publishedAt: now,
      topicId: peopleDraft.topicId,
      anchor,
      locked: {
        calm: peopleDraft.locked.calm!,
        bridge: peopleDraft.locked.bridge!,
        cynical: peopleDraft.locked.cynical!,
        opposite: peopleDraft.locked.opposite!,
        playful: peopleDraft.locked.playful!,
      },
    } as any;

    set((s) => ({
      peopleDecks: [published, ...s.peopleDecks],
      peopleDraft: null,
    }));

    return published;
  },

  voteOnPost: (postId: string, value: 1 | -1) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, votes: (p.votes ?? 0) + value } : p
      ),
      peopleDecks: s.peopleDecks.map((d) => ({
        ...d,
        anchor:
          d.anchor?.id === postId
            ? { ...d.anchor, votes: (d.anchor.votes ?? 0) + value }
            : d.anchor,
        locked: Object.fromEntries(
          Object.entries(d.locked ?? {}).map(([k, p]) => [
            k,
            (p as any)?.id === postId
              ? { ...(p as any), votes: (((p as any).votes ?? 0) + value) }
              : p,
          ])
        ) as any,
      })),
    }));
  },

  addReplyToPost: (postId: string, text: string) => {
    const { currentUser } = get();
    const reply = {
      id: uid("r"),
      author: currentUser,
      authorDisplayName: currentUser.name,
      text,
      createdAt: Date.now(),
    } as any;

    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, replies: [...(p.replies ?? []), reply] }
          : p
      ),
      peopleDecks: s.peopleDecks.map((d) => ({
        ...d,
        anchor:
          d.anchor?.id === postId
            ? { ...d.anchor, replies: [...(d.anchor.replies ?? []), reply] }
            : d.anchor,
        locked: Object.fromEntries(
          Object.entries(d.locked ?? {}).map(([k, p]) => [
            k,
            (p as any)?.id === postId
              ? { ...(p as any), replies: [...((p as any).replies ?? []), reply] }
              : p,
          ])
        ) as any,
      })),
    }));
  },
}));
