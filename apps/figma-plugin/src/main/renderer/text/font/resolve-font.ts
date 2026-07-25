import type { FontCandidateInput, FontResolver, ResolvedFont } from "../contracts/font-resolver";
import type { FigmaFontAdapter } from "../adapter/figma-font-adapter";
import { parseFontFamilyList } from "./parse-font-family-list";
import { buildStyleCandidates } from "./normalize-font-style";
import { scoreFontMatch } from "./score-font-match";
import { GENERIC_FONT_FALLBACKS, SYSTEM_FONT_FALLBACKS } from "./font-fallback-policy";

export function createFontResolver(adapter: FigmaFontAdapter): FontResolver {
  let availablePromise: Promise<Array<{ family: string; style: string }>> | undefined;
  const listAvailable = async () => {
    availablePromise ??= adapter.listAvailableFonts();
    return availablePromise;
  };
  return {
    async resolve(input: FontCandidateInput): Promise<ResolvedFont | null> {
      const available = await listAvailable();
      if (!available.length) return null;
      const parsedFamilies = parseFontFamilyList(input.fontFamilies);
      const styles = buildStyleCandidates(input.fontWeight, input.fontStyle);
      for (const family of parsedFamilies.filter((item) => !item.generic)) {
        const match = scoreFontMatch(available, { family: family.displayName, styleCandidates: styles.candidates, source: family.nextFontDerived ? "FAMILY_FALLBACK" : "EXACT", baseScore: family.nextFontDerived ? 70 : 100, warnings: [...family.warnings, ...styles.warnings] });
        if (match) return toResolved(match);
      }
      for (const generic of parsedFamilies.filter((item) => item.generic)) {
        for (const candidate of GENERIC_FONT_FALLBACKS[generic.key] ?? []) {
          const match = scoreFontMatch(available, { family: candidate, styleCandidates: styles.candidates, source: "SYSTEM_FALLBACK", baseScore: 60, warnings: [...generic.warnings, ...styles.warnings, `Generic family ${generic.displayName} used fallback.`] });
          if (match) return toResolved(match);
        }
      }
      for (const candidate of SYSTEM_FONT_FALLBACKS) {
        const match = scoreFontMatch(available, { family: candidate, styleCandidates: styles.candidates, source: "SYSTEM_FALLBACK", baseScore: 40, warnings: styles.warnings });
        if (match) return toResolved(match);
      }
      const firstRegular = available.find((font) => font.style.toLowerCase() === "regular");
      const first = firstRegular ?? available[0];
      return first ? { family: first.family, style: first.style, source: "FIRST_AVAILABLE", score: 10, warnings: ["First available Figma font was used."] } : null;
    },
  };
}

function toResolved(match: ReturnType<typeof scoreFontMatch> extends infer T ? NonNullable<T> : never): ResolvedFont {
  return { family: match.font.family, style: match.font.style, source: match.source, score: match.score, warnings: match.warnings };
}
