import type { TimelineId } from "@/theme/timelines";

export type PrototypeMode = "people" | "ai";

export type MockAuthor = {
  id: string;
  name: string;
  handle: string;
};

export type SourceType = "original" | "import-self" | "import-other" | "repost";

export type MockPost = {
  id: string;
  text: string;
  author: MockAuthor;
  createdAt: number; // epoch ms
  sourceType: SourceType;
  topicId: string;

  // For People Mode candidates only:
  lensLabel?: TimelineId;

  // simple engagement for prototype
  votes?: number;
  replies?: Array<{
    id: string;
    author: MockAuthor;
    text: string;
    createdAt: number;
  }>;
};

export type PeopleDeckDraft = {
  id: string;
  ownerUserId: string;
  anchorText: string;
  topicId: string;
  createdAt: number;
  locked: Partial<Record<TimelineId, MockPost>>;
};

export type PeopleDeckPublished = {
  id: string;
  ownerUserId: string;
  createdAt: number;
  topicId: string;

  anchor: MockPost; // the anchor as a post-like object
  locked: Record<TimelineId, MockPost>; // must be fully filled at publish time
};

export type PrototypeState = {
  seeded: boolean;

  // simulate logged-in user
  currentUser: MockAuthor;

  // all candidate posts in the pool
  posts: MockPost[];

  // draft + published
  peopleDraft: PeopleDeckDraft | null;
  peopleDecks: PeopleDeckPublished[];

  // actions
  seedIfNeeded: () => void;

  startPeopleDraft: (args: { anchorText: string; topicId: string }) => void;
  clearDraftPeopleDeck: () => void;

  getCandidatesForDraft: (lens: TimelineId) => MockPost[];

  lockDraftMatch: (lens: TimelineId, postId: string) => void;
  unlockDraftLens: (lens: TimelineId) => void;

  publishDraftPeopleDeck: () => PeopleDeckPublished | null;

  // engagement
  voteOnPost: (postId: string, value: 1 | -1) => void;
  addReplyToPost: (postId: string, text: string) => void;
};
