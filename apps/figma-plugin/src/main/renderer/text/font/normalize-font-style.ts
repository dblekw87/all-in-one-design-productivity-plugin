import { mapFontWeight } from "./map-font-weight";

export function normalizeFontStyleKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function buildStyleCandidates(weightInput: number | string | undefined, fontStyle: string | undefined): { candidates: string[]; italic: boolean; warnings: string[] } {
  const weight = mapFontWeight(weightInput);
  const style = (fontStyle ?? "normal").trim().toLowerCase();
  const italic = style === "italic" || style === "oblique";
  const warnings = [...weight.warnings];
  if (style === "oblique") warnings.push("CSS oblique was mapped to italic fallback candidates.");
  const candidates: string[] = [];
  if (italic) {
    for (const candidate of weight.candidates) {
      candidates.push(`${candidate} Italic`, `${candidate}Italic`, `Italic ${candidate}`);
    }
    candidates.push("Italic");
  }
  candidates.push(...weight.candidates, "Regular", "Normal");
  return { candidates: unique(candidates), italic, warnings };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeFontStyleKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
