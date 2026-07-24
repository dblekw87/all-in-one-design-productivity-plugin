import type { DomSnapshotVersion } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";

export interface GeometryRect {
  x: number;
  y: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface GeometryEvidenceEntry {
  snapshotId: string;
  boundingRect: GeometryRect;
  documentRect: { x: number; y: number; width: number; height: number };
  boxMetrics: {
    clientWidth: number;
    clientHeight: number;
    offsetWidth: number;
    offsetHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  };
  flags: {
    zeroWidth: boolean;
    zeroHeight: boolean;
    zeroArea: boolean;
    intersectsViewport: boolean;
    fullyInsideViewport: boolean;
    overflowsOwnBox: boolean;
  };
}

export interface GeometryEvidenceWarning {
  code: "GEOMETRY_ENTRY_MISSING" | "GEOMETRY_VALUE_INVALID" | "ZERO_AREA_ELEMENT" | "ELEMENT_OUTSIDE_VIEWPORT" | "GEOMETRY_ENTRY_LIMIT_REACHED" | "SNAPSHOT_PIPELINE_UNSTABLE";
  message: string;
  snapshotId?: string;
  severity: "INFO" | "WARNING";
}

export interface GeometryEvidenceMetrics {
  entryCount: number;
  zeroAreaCount: number;
  outsideViewportCount: number;
  partiallyVisibleCount: number;
  overflowingElementCount: number;
  extractionTimeMs: number;
}

export interface GeometryEvidenceDocument {
  geometryVersion: "1.0";
  source: {
    domSnapshotVersion: DomSnapshotVersion;
    styleSnapshotVersion: StyleSnapshotDocument["styleSnapshotVersion"];
    requestedUrl: string;
    finalUrl: string;
    capturedAt: string;
  };
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    scrollX: number;
    scrollY: number;
  };
  document: {
    scrollWidth: number;
    scrollHeight: number;
    clientWidth: number;
    clientHeight: number;
  };
  entries: GeometryEvidenceEntry[];
  metrics: GeometryEvidenceMetrics;
  warnings: GeometryEvidenceWarning[];
}
