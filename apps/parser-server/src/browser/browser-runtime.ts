import type { AnalyzeViewport } from "@aio/shared-contracts";
import type { BrowserNavigationSecurityReport } from "./security/security-report.js";
import type { DomSnapshotDocument } from "@aio/dom-snapshot";
import type { DomExtractionOptions } from "./dom/dom-extraction-options.js";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import type { StyleExtractionOptions } from "./style/style-extraction-options.js";
import type { GeometryEvidenceDocument } from "@aio/geometry-evidence";
import type { GeometryExtractionOptions } from "./geometry/geometry-options.js";

export interface BrowserNavigationRequest {
  url: string;
  viewport: AnalyzeViewport;
  timeoutMs: number;
  extraction?: DomExtractionOptions;
  styleExtraction?: StyleExtractionOptions;
  geometryExtraction?: GeometryExtractionOptions;
}

export interface BrowserNavigationResult {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number | null;
  title: string;
  contentType: string | null;
  viewport: AnalyzeViewport;
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  security: BrowserNavigationSecurityReport;
  snapshot: DomSnapshotDocument;
  styleSnapshot: StyleSnapshotDocument;
  geometry: GeometryEvidenceDocument;
}

export interface BrowserRuntime {
  navigate(
    request: BrowserNavigationRequest,
    options?: {
      signal?: AbortSignal;
    }
  ): Promise<BrowserNavigationResult>;

  close(): Promise<void>;
}
