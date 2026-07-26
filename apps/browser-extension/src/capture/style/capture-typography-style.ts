import type { CapturedStyleEntry } from "./capture-computed-style.js";

const TYPOGRAPHY_KEYS = new Set(["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "color", "text-align", "text-decoration-line", "text-transform", "white-space", "word-break", "overflow-wrap"]);

export function getTypographyStyle(entry: CapturedStyleEntry): Record<string, string> {
  return Object.fromEntries(Object.entries(entry.properties).filter(([key]) => TYPOGRAPHY_KEYS.has(key)));
}
