import type { DomSnapshotVersion } from "./version.js";

export type DomSnapshotWarningCode =
  | "DOM_NODE_LIMIT_REACHED"
  | "DOM_DEPTH_LIMIT_REACHED"
  | "TEXT_NODE_TRUNCATED"
  | "IFRAME_CONTENT_SKIPPED"
  | "CANVAS_CONTENT_SKIPPED"
  | "SHADOW_ROOT_SKIPPED"
  | "PSEUDO_ELEMENT_EXTRACTION_DEFERRED";

export interface DomSnapshotWarning {
  code: DomSnapshotWarningCode;
  message: string;
  snapshotId?: string;
  severity: "INFO" | "WARNING";
}

export interface DomSnapshotMetrics {
  elementNodeCount: number;
  textNodeCount: number;
  totalNodeCount: number;
  maxDepthObserved: number;
  iframeCount: number;
  canvasCount: number;
  svgCount: number;
  imageCount: number;
  hiddenAttributeCount: number;
  ariaHiddenCount: number;
  truncatedTextNodeCount: number;
  skippedNodeCount: number;
  nodeLimitReached: boolean;
  depthLimitReached: boolean;
  extractionTimeMs: number;
}

export interface DomSnapshotSemantic {
  role?: string;
  ariaLabel?: string;
  ariaDescription?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  landmark?: string;
}

export interface DomSnapshotFlags {
  hiddenAttribute: boolean;
  ariaHidden: boolean;
  inert: boolean;
  disabled: boolean;
  contentEditable: boolean;
}

export interface DomSnapshotElementNode {
  nodeType: "ELEMENT";
  snapshotId: string;
  parentSnapshotId?: string;
  tagName: string;
  namespace?: string;
  attributes: Record<string, string>;
  inlineSvg?: string;
  semantic: DomSnapshotSemantic;
  flags: DomSnapshotFlags;
  children: DomSnapshotNode[];
}

export interface DomSnapshotTextNode {
  nodeType: "TEXT";
  snapshotId: string;
  parentSnapshotId: string;
  text: string;
  flags: { whitespaceOnly: boolean };
}

export type DomSnapshotNode = DomSnapshotElementNode | DomSnapshotTextNode;

export interface DomSnapshotDocument {
  snapshotVersion: DomSnapshotVersion;
  source: {
    requestedUrl: string;
    finalUrl: string;
    title: string;
    capturedAt: string;
  };
  root: DomSnapshotElementNode;
  metrics: DomSnapshotMetrics;
  warnings: DomSnapshotWarning[];
  extractionOptions: {
    excludeHidden: boolean;
    excludeIframes: boolean;
    excludeCanvas: boolean;
    includePseudoElements: boolean;
  };
}
