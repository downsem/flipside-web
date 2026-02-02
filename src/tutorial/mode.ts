"use client";

const KEY = "fs_tutorial_active_v1";
const EVT = "fs:tutorial_change";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

export function isTutorialActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function activateTutorial() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "1");
  emit();
}

export function deactivateTutorial() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  emit();
}

export function onTutorialChange(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
