import { normalizeFontFamily, type NormalizedFontFamily } from "./normalize-font-family";

export function parseFontFamilyList(input: string | string[] | undefined): NormalizedFontFamily[] {
  const raw = Array.isArray(input) ? input : splitCssFontFamilyList(input ?? "");
  const seen = new Set<string>();
  const result: NormalizedFontFamily[] = [];
  for (const family of raw) {
    const normalized = normalizeFontFamily(family);
    if (!normalized.displayName || seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    result.push(normalized);
  }
  return result;
}

function splitCssFontFamilyList(value: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: string | undefined;
  for (const char of value) {
    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = undefined;
      continue;
    }
    if (char === "," && !quote) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result.map((item) => item.trim()).filter(Boolean);
}
