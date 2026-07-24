import type { DomSnapshotVersion } from "@aio/dom-snapshot";
import type { StyleProperty } from "./properties.js";

export type ComputedStyleValues = Partial<Record<StyleProperty, string>>;

export interface PseudoElementStyleSnapshot {
  pseudoType: "BEFORE" | "AFTER";
  content: string;
  styles: ComputedStyleValues;
}

export interface StyleSnapshotEntry {
  snapshotId: string;
  styles: ComputedStyleValues;
  pseudo?: {
    before?: PseudoElementStyleSnapshot;
    after?: PseudoElementStyleSnapshot;
  };
}

export type StyleSnapshotWarningCode =
  | "STYLE_ENTRY_MISSING"
  | "STYLE_EXTRACTION_FAILED"
  | "PSEUDO_CONTENT_UNSUPPORTED"
  | "PSEUDO_STYLE_EXTRACTION_FAILED"
  | "UNSUPPORTED_COMPUTED_VALUE"
  | "STYLE_ENTRY_LIMIT_REACHED";

export interface StyleSnapshotWarning {
  code: StyleSnapshotWarningCode;
  message: string;
  snapshotId?: string;
  property?: string;
  severity: "INFO" | "WARNING";
}

export interface StyleSnapshotMetrics {
  entryCount: number;
  pseudoBeforeCount: number;
  pseudoAfterCount: number;
  flexContainerCount: number;
  gridContainerCount: number;
  hiddenByDisplayCount: number;
  hiddenByVisibilityCount: number;
  transparentElementCount: number;
  extractionTimeMs: number;
}

export interface StyleSnapshotDocument {
  styleSnapshotVersion: "1.0";
  source: {
    domSnapshotVersion: DomSnapshotVersion;
    requestedUrl: string;
    finalUrl: string;
    capturedAt: string;
  };
  entries: StyleSnapshotEntry[];
  metrics: StyleSnapshotMetrics;
  warnings: StyleSnapshotWarning[];
}
