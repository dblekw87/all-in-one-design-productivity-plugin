export interface FontWeightMapping {
  weight: number;
  candidates: string[];
  warnings: string[];
}

const WEIGHT_STYLE_CANDIDATES: Record<number, string[]> = {
  100: ["Thin", "Hairline"],
  200: ["Extra Light", "ExtraLight", "Ultra Light", "UltraLight"],
  300: ["Light"],
  400: ["Regular", "Normal", "Book"],
  500: ["Medium"],
  600: ["Semi Bold", "SemiBold", "Semibold", "Demi Bold", "DemiBold"],
  700: ["Bold"],
  800: ["Extra Bold", "ExtraBold", "Ultra Bold", "UltraBold"],
  900: ["Black", "Heavy"],
};

export function mapFontWeight(value: number | string | undefined): FontWeightMapping {
  const warnings: string[] = [];
  let weight = 400;
  if (typeof value === "number" && Number.isFinite(value)) weight = value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) weight = parsed;
    else if (normalized === "normal") weight = 400;
    else if (normalized === "bold") weight = 700;
    else if (normalized === "lighter") { weight = 300; warnings.push("CSS lighter was resolved without parent context."); }
    else if (normalized === "bolder") { weight = 700; warnings.push("CSS bolder was resolved without parent context."); }
  }
  if (weight < 1 || weight > 1000) {
    warnings.push("Font weight was outside CSS range and clamped.");
    weight = Math.min(1000, Math.max(1, weight));
  }
  const bucket = nearestWeightBucket(weight);
  return { weight: bucket, candidates: WEIGHT_STYLE_CANDIDATES[bucket] ?? ["Regular"], warnings };
}

function nearestWeightBucket(weight: number): number {
  const buckets = Object.keys(WEIGHT_STYLE_CANDIDATES).map(Number);
  return buckets.reduce((best, candidate) => Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best, 400);
}
