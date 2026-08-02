import type { CaptureSnapshot } from "@aio/shared-contracts";
import { STYLE_PROPERTY_ALLOWLIST } from "../style/style-property-allowlist.js";
import type { CapturedDomTree } from "../dom/capture-dom-tree.js";

export interface BrowserCaptureValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateBrowserCaptureSnapshot(snapshot: CaptureSnapshot): BrowserCaptureValidationResult {
  const errors: string[] = [];
  if (snapshot.version !== "1.0") errors.push("snapshot version must be 1.0");
  if (snapshot.capture.mode !== "BROWSER_TAB") errors.push("capture mode must be BROWSER_TAB");
  for (const capture of snapshot.screenshots.captures as Array<{ dataUrl?: string; width?: number; height?: number }>) {
    if (!capture.dataUrl?.startsWith("data:image/")) errors.push("screenshot capture must include an image data URL");
    if (!Number.isFinite(capture.width) || !Number.isFinite(capture.height) || capture.width! <= 0 || capture.height! <= 0) errors.push("screenshot dimensions must be positive");
  }
  const dom = snapshot.dom as CapturedDomTree | undefined;
  const nodeIds = new Set(dom?.nodes.map((node) => node.captureNodeId) ?? []);
  if (dom) {
    if (!nodeIds.has(dom.rootCaptureNodeId)) errors.push("rootCaptureNodeId must exist in dom nodes");
    if (nodeIds.size !== dom.nodes.length) errors.push("captureNodeId values must be unique");
  }
  const styles = snapshot.styles as { entries?: Array<{ captureNodeId: string; properties: Record<string, string> }> } | undefined;
  const allowed = new Set<string>(STYLE_PROPERTY_ALLOWLIST);
  for (const entry of styles?.entries ?? []) {
    if (!nodeIds.has(entry.captureNodeId)) errors.push("style entry references a missing node");
    for (const property of Object.keys(entry.properties)) {
      if (!allowed.has(property)) errors.push(`style property is not allowlisted: ${property}`);
    }
  }
  const geometry = snapshot.geometry as { entries?: Array<{ captureNodeId: string; width: number; height: number; documentX: number; documentY: number }> } | undefined;
  for (const entry of geometry?.entries ?? []) {
    if (!nodeIds.has(entry.captureNodeId)) errors.push("geometry entry references a missing node");
    for (const value of [entry.width, entry.height, entry.documentX, entry.documentY]) {
      if (!Number.isFinite(value)) errors.push("geometry values must be finite");
    }
  }
  const assets = snapshot.assets as { references?: Array<{ sourceNodeId: string }> } | undefined;
  for (const reference of assets?.references ?? []) {
    if (!nodeIds.has(reference.sourceNodeId)) errors.push("asset reference points to a missing node");
  }
  if (snapshot.metrics.warningCount !== snapshot.warnings.length) errors.push("warning metrics must match warnings length");
  return { ok: errors.length === 0, errors };
}
