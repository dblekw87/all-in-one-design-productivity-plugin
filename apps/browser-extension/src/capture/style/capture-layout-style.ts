import type { CapturedStyleEntry } from "./capture-computed-style.js";

export function getLayoutStyle(entry: CapturedStyleEntry): Record<string, string> {
  return Object.fromEntries(Object.entries(entry.properties).filter(([key]) => key.includes("flex") || key.includes("grid") || ["display", "position", "gap", "row-gap", "column-gap"].includes(key)));
}
