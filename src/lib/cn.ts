import { clsx, type ClassValue } from "clsx";

// We intentionally keep this lightweight (clsx only) to avoid lockfile churn.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
