import type { AvailableFont, FontMatchRequest, FontMatchResult } from "../contracts/font-match";
import { fontFamilyKey } from "./normalize-font-family";
import { normalizeFontStyleKey } from "./normalize-font-style";

export function scoreFontMatch(availableFonts: AvailableFont[], request: FontMatchRequest): FontMatchResult | null {
  const familyKey = fontFamilyKey(request.family);
  const sameFamily = availableFonts.filter((font) => fontFamilyKey(font.family) === familyKey);
  if (!sameFamily.length) return null;
  const styleKeys = request.styleCandidates.map(normalizeFontStyleKey);
  for (let index = 0; index < styleKeys.length; index += 1) {
    const match = sameFamily.find((font) => normalizeFontStyleKey(font.style) === styleKeys[index]);
    if (match) {
      return { font: match, source: request.source, score: Math.max(1, request.baseScore - index * 2), warnings: request.warnings ?? [] };
    }
  }
  const regular = sameFamily.find((font) => ["regular", "normal"].includes(normalizeFontStyleKey(font.style)));
  if (regular) return { font: regular, source: "WEIGHT_FALLBACK", score: Math.min(request.baseScore, 80), warnings: [...(request.warnings ?? []), "Font style fell back to Regular."] };
  return { font: sameFamily[0]!, source: "WEIGHT_FALLBACK", score: Math.min(request.baseScore, 70), warnings: [...(request.warnings ?? []), "Font style fell back to first family style."] };
}
