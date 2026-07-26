import type { CapturedStyleEntry } from "./capture-computed-style.js";

export function getVisualStyle(entry: CapturedStyleEntry): Record<string, string> {
  return Object.fromEntries(Object.entries(entry.properties).filter(([key]) => key.startsWith("background") || key.startsWith("border") || ["box-shadow", "opacity", "visibility", "transform", "filter", "backdrop-filter", "mix-blend-mode", "clip-path", "mask-image"].includes(key)));
}
