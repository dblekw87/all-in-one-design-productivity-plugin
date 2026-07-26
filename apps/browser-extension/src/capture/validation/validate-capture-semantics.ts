import type { CapturedDomTree } from "../dom/capture-dom-tree.js";

export interface BrowserCaptureSemanticValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateCapturedDomSemantics(dom: CapturedDomTree): BrowserCaptureSemanticValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const node of dom.nodes) {
    if (ids.has(node.captureNodeId)) errors.push("duplicate captureNodeId");
    ids.add(node.captureNodeId);
    if (node.nodeType === "TEXT" && node.childCaptureNodeIds.length > 0) errors.push("text nodes cannot have children");
    const childIds = new Set(node.childCaptureNodeIds);
    if (childIds.size !== node.childCaptureNodeIds.length) errors.push("childCaptureNodeIds cannot contain duplicates");
  }
  for (const node of dom.nodes) {
    if (node.parentCaptureNodeId && !ids.has(node.parentCaptureNodeId)) errors.push("parentCaptureNodeId points to a missing node");
    for (const childId of node.childCaptureNodeIds) {
      if (!ids.has(childId)) errors.push("childCaptureNodeId points to a missing node");
    }
  }
  if (!ids.has(dom.rootCaptureNodeId)) errors.push("rootCaptureNodeId is missing");
  return { ok: errors.length === 0, errors };
}
