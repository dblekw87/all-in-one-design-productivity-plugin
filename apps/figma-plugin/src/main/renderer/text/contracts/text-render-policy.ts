export const PLUGIN_TEXT_POLICY = {
  maxTextLength: 100_000,
  minFontSize: 1,
  maxFontSize: 1_000,
  fallbackTextColor: { r: 0, g: 0, b: 0 },
} as const;

export type TextFailurePolicy = "FALLBACK_FONT" | "PLACEHOLDER" | "FAIL_RENDER";
