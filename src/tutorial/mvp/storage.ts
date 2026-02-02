import type { MvpMockPost, MvpMockRewrites } from "./mock";

const KEY = "fs_tutorial_mvp_v0";

export type MvpTutorialState = {
  post: MvpMockPost;
  rewrites: MvpMockRewrites;
};

export function saveMvpTutorialState(state: MvpTutorialState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function loadMvpTutorialState(): MvpTutorialState | null {
  if (typeof window === "undefined") return null;
  const s = sessionStorage.getItem(KEY);
  if (!s) return null;
  try {
    return JSON.parse(s) as MvpTutorialState;
  } catch {
    return null;
  }
}

export function clearMvpTutorialState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
