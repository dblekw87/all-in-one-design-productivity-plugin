import type { CaptureSnapshot } from "@aio/shared-contracts";
import type { BrowserCaptureError, BrowserCaptureWarning } from "./browser-capture-errors.js";
import type { BrowserCaptureProgress } from "./browser-capture-progress.js";

export type BrowserCaptureStatus = "COMPLETED" | "CANCELLED" | "PARTIAL" | "FAILED";

export interface BrowserCaptureMetrics {
  nodeCount: number;
  elementCount: number;
  textNodeCount: number;
  styleCount: number;
  geometryCount: number;
  pseudoCount: number;
  inlineSvgCount: number;
  assetReferenceCount: number;
  skippedNodeCount: number;
  hiddenCount: number;
  flexContainerCount: number;
  gridContainerCount: number;
  durationMs: number;
  truncated: boolean;
}

export interface BrowserCaptureResult {
  status: BrowserCaptureStatus;
  snapshot?: CaptureSnapshot;
  warnings: BrowserCaptureWarning[];
  metrics: BrowserCaptureMetrics;
  progress: BrowserCaptureProgress[];
  error?: BrowserCaptureError;
}

export interface BrowserCaptureSummary {
  status: BrowserCaptureStatus;
  snapshotVersion?: string;
  sessionId: string;
  nodeCount: number;
  elementCount: number;
  textNodeCount: number;
  styleCount: number;
  geometryCount: number;
  pseudoCount: number;
  inlineSvgCount: number;
  assetReferenceCount: number;
  hiddenCount: number;
  skippedNodeCount: number;
  warningCount: number;
  durationMs: number;
  truncated: boolean;
}
