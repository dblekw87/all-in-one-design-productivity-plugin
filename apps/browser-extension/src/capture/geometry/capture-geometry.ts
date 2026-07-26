import { finiteNumber } from "./coordinate-policy.js";
import { captureClientMetrics, type CapturedClientMetrics } from "./capture-client-metrics.js";

export interface CapturedGeometryEntry {
  captureNodeId: string;
  viewportX: number;
  viewportY: number;
  documentX: number;
  documentY: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  client: CapturedClientMetrics;
  transformAppliedInBounds: boolean;
}

export interface CapturedGeometrySnapshot {
  entries: CapturedGeometryEntry[];
}

export function captureGeometryEntry(captureNodeId: string, element: Element, view: Window = window): CapturedGeometryEntry {
  const rect = element.getBoundingClientRect();
  return {
    captureNodeId,
    viewportX: finiteNumber(rect.left),
    viewportY: finiteNumber(rect.top),
    documentX: finiteNumber(rect.left + view.scrollX),
    documentY: finiteNumber(rect.top + view.scrollY),
    width: finiteNumber(rect.width),
    height: finiteNumber(rect.height),
    top: finiteNumber(rect.top),
    right: finiteNumber(rect.right),
    bottom: finiteNumber(rect.bottom),
    left: finiteNumber(rect.left),
    client: captureClientMetrics(element),
    transformAppliedInBounds: window.getComputedStyle(element).transform !== "none"
  };
}

export function captureGeometry(elementsByCaptureNodeId: Map<string, Element>): CapturedGeometrySnapshot {
  return {
    entries: Array.from(elementsByCaptureNodeId.entries()).map(([captureNodeId, element]) => captureGeometryEntry(captureNodeId, element))
  };
}
