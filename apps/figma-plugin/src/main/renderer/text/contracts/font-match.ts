export interface AvailableFont {
  family: string;
  style: string;
}

export interface FontMatchRequest {
  family: string;
  styleCandidates: string[];
  source: "EXACT" | "FAMILY_FALLBACK" | "WEIGHT_FALLBACK" | "SYSTEM_FALLBACK" | "FIRST_AVAILABLE";
  baseScore: number;
  warnings?: string[];
}

export interface FontMatchResult {
  font: AvailableFont;
  score: number;
  source: FontMatchRequest["source"];
  warnings: string[];
}
