export interface FontCandidateInput {
  fontFamilies: string[];
  fontWeight?: number | string;
  fontStyle?: string;
}

export type FontResolutionSource =
  | "EXACT"
  | "FAMILY_FALLBACK"
  | "WEIGHT_FALLBACK"
  | "SYSTEM_FALLBACK"
  | "FIRST_AVAILABLE";

export interface ResolvedFont {
  family: string;
  style: string;
  source: FontResolutionSource;
  score: number;
  warnings: string[];
}

export interface FontResolver {
  resolve(input: FontCandidateInput): Promise<ResolvedFont | null>;
}
