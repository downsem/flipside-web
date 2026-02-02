"use client";

const KEY = "fs_people_mode_active_v1";
const EVT = "fs_people_mode_changed_v1";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

export function activatePeopleMode() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "1");
  emit();
}

export function deactivatePeopleMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  emit();
}

export function isPeopleModeActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function onPeopleModeChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
