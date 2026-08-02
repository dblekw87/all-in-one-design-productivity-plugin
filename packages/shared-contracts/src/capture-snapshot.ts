import type { CaptureMode, CaptureSource } from "./capture.js";

export type CaptureSnapshotVersion = "1.0";
export const CAPTURE_SNAPSHOT_VERSION: CaptureSnapshotVersion = "1.0";

export interface CaptureSnapshotViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface CaptureSnapshotScroll {
  x: number;
  y: number;
}

export interface CaptureSnapshotDocumentMetadata {
  requestedUrl?: string;
  finalUrl?: string;
  title?: string;
  contentType?: string | null;
  capturedAt: string;
}

export interface CaptureSnapshotMetadata {
  captureMode: CaptureMode;
  captureProvider?: string;
  browser?: string;
  platform?: string;
  captureTime: string;
  locale?: string;
  theme?: "light" | "dark" | "no-preference" | "unknown";
  devicePixelRatio: number;
  viewport: CaptureSnapshotViewport;
  scroll: CaptureSnapshotScroll;
}

export interface CaptureSnapshotWarning {
  code: string;
  message: string;
  severity: "INFO" | "WARNING" | "ERROR";
  source?: "DOM" | "STYLE" | "GEOMETRY" | "ASSET" | "CAPTURE" | "SNAPSHOT";
  sourceNodeId?: string;
}

export interface CaptureSnapshotMetrics {
  domCount: number;
  styleCount: number;
  geometryCount: number;
  svgCount: number;
  pseudoCount: number;
  assetCount: number;
  warningCount: number;
  durationMs: number;
}

export interface CaptureSnapshotPseudoSummary {
  beforeCount: number;
  afterCount: number;
}

export interface CaptureSnapshotSvgSummary {
  count: number;
  inlineCount?: number;
  externalCount?: number;
  entries?: unknown[];
}

export interface CaptureSnapshotScreenshotSet {
  captures: unknown[];
}

export interface CaptureSnapshotCapture {
  mode: CaptureMode;
  providerId?: string;
  source: CaptureSource;
}

export interface CaptureSnapshot {
  version: CaptureSnapshotVersion;
  capture: CaptureSnapshotCapture;
  document: CaptureSnapshotDocumentMetadata;
  viewport: CaptureSnapshotViewport;
  scroll: CaptureSnapshotScroll;
  metadata: CaptureSnapshotMetadata;
  dom?: unknown;
  styles?: unknown;
  geometry?: unknown;
  assets?: unknown;
  pseudo: CaptureSnapshotPseudoSummary;
  svg: CaptureSnapshotSvgSummary;
  screenshots: CaptureSnapshotScreenshotSet;
  warnings: CaptureSnapshotWarning[];
  metrics: CaptureSnapshotMetrics;
}

export interface CaptureSnapshotSummary {
  version: CaptureSnapshotVersion;
  captureMode: CaptureMode;
  captureProvider?: string;
  finalUrl?: string;
  title?: string;
  domCount: number;
  styleCount: number;
  geometryCount: number;
  assetCount: number;
  warningCount: number;
  durationMs: number;
}
