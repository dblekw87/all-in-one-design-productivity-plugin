import type { BrowserCaptureOptions } from "../contracts/browser-capture-request.js";

export const DEFAULT_BROWSER_CAPTURE_OPTIONS: BrowserCaptureOptions = {
  includeHidden: false,
  includePseudo: true,
  includeInlineSvg: true,
  includeAssets: true,
  maxNodes: 5000,
  maxDepth: 80
};

export const BROWSER_CAPTURE_LIMITS = {
  maxTextLengthPerNode: 500,
  maxTotalTextLength: 100000,
  maxStyleProperties: 96,
  maxInlineSvgBytes: 20000,
  maxAssetReferences: 1000,
  maxCaptureDurationMs: 15000,
  yieldEveryNodeCount: 100
} as const;

export function normalizeCaptureOptions(options?: Partial<BrowserCaptureOptions>): BrowserCaptureOptions {
  return {
    ...DEFAULT_BROWSER_CAPTURE_OPTIONS,
    ...options,
    maxNodes: Math.max(1, Math.floor(options?.maxNodes ?? DEFAULT_BROWSER_CAPTURE_OPTIONS.maxNodes)),
    maxDepth: Math.max(1, Math.floor(options?.maxDepth ?? DEFAULT_BROWSER_CAPTURE_OPTIONS.maxDepth))
  };
}
