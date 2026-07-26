import type { DesignIrDocument } from "@aio/design-ir";
import type { CaptureMode, CaptureSource } from "./capture.js";
import type { CaptureSnapshot } from "./capture-snapshot.js";
import type { AssetTransferSessionResponse } from "./import-session.js";

export type AnalyzeContractVersion = "1.0";

export interface AnalyzeViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface AnalyzeCaptureOptions {
  mode: "VIEWPORT" | "FIXED_HEIGHT";
  maxHeight?: number | undefined;
}

export interface AnalyzeOptions {
  excludeHidden: boolean;
  excludeIframes: boolean;
  excludeCanvas: boolean;
  includePseudoElements: boolean;
}

export interface AnalyzeWebsiteRequest {
  contractVersion: AnalyzeContractVersion;
  captureMode?: CaptureMode;
  url: string;
  viewport: AnalyzeViewport;
  capture: AnalyzeCaptureOptions;
  options: AnalyzeOptions;
}

export type AnalyzeWarningSeverity = "INFO" | "WARNING" | "ERROR";

export interface AnalyzeWarning {
  code: string;
  message: string;
  severity: AnalyzeWarningSeverity;
  sourceNodeId?: string;
  sourceSelector?: string;
}

export interface AnalyzeAssetReference {
  id: string;
  type: "IMAGE" | "SVG" | "RASTER_FALLBACK";
  mimeType: string;
  sourceUrl?: string;
  retrievalUrl?: string;
  contentHash?: string;
  width?: number;
  height?: number;
}

export interface AnalyzeMetrics {
  processingTimeMs: number;
  domNodeCount: number;
  designNodeCount: number;
  assetCount: number;
  geometryEntryCount?: number;
}

export interface AnalyzeWebsiteResponse {
  contractVersion: AnalyzeContractVersion;
  requestId: `req_${string}`;
  status: "NOT_IMPLEMENTED" | "BROWSER_NAVIGATED" | "DOM_SNAPSHOTTED" | "STYLE_SNAPSHOTTED" | "GEOMETRY_CAPTURED" | "NORMALIZED" | "LAYOUT_EVIDENCE_BUILT" | "LAYOUT_INFERRED" | "SIZING_INFERRED" | "ASSET_REFERENCES_EXTRACTED" | "ASSETS_RESOLVED" | "DESIGN_IR_BUILT" | "TRANSFER_SESSION_READY" | "ANALYZED";
  target: {
    normalizedUrl: string;
  };
  captureSource?: CaptureSource;
  viewport: AnalyzeViewport;
  navigation?: {
    requestedUrl: string;
    finalUrl: string;
    statusCode: number | null;
    title: string;
    contentType: string | null;
  };
  security?: {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    redirectCount: number;
    blockedByCode: Record<string, number>;
    warnings: AnalyzeWarning[];
  };
  document?: DesignIrDocument;
  snapshot?: unknown;
  captureSnapshot?: CaptureSnapshot;
  styleSnapshot?: unknown;
  geometry?: unknown;
  normalizedModel?: unknown;
  layoutEvidence?: unknown;
  layoutInference?: unknown;
  sizingInference?: unknown;
  assetReferences?: unknown;
  resolvedAssets?: unknown;
  assetTransfer?: AssetTransferSessionResponse;
  assets: AnalyzeAssetReference[];
  warnings: AnalyzeWarning[];
  metrics: AnalyzeMetrics;
}
