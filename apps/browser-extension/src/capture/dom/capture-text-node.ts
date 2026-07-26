import { BROWSER_CAPTURE_LIMITS } from "../runtime/capture-limits.js";

export function normalizeCapturedText(value: string, remainingTotalLength: number): { text: string; truncated: boolean } {
  const normalized = value.split(String.fromCharCode(0)).join("").replace(/\s+/g, " ").trim();
  const allowed = Math.max(0, Math.min(BROWSER_CAPTURE_LIMITS.maxTextLengthPerNode, remainingTotalLength));
  return {
    text: normalized.slice(0, allowed),
    truncated: normalized.length > allowed
  };
}
