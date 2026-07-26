import type { BrowserCaptureContext } from "../runtime/capture-context.js";
import { BROWSER_CAPTURE_LIMITS } from "../runtime/capture-limits.js";
import { inspectInlineSvgSafety, type InlineSvgSafety } from "./sanitize-svg-reference.js";

export interface CapturedInlineSvg {
  captureNodeId: string;
  viewBox?: string;
  width?: string;
  height?: string;
  namespace: string | null;
  outerHTML: string;
  referencedAssetUrls: string[];
  safety: InlineSvgSafety;
  truncated: boolean;
}

export interface CapturedInlineSvgSnapshot {
  entries: CapturedInlineSvg[];
}

export function captureInlineSvg(elementsByCaptureNodeId: Map<string, Element>, context: BrowserCaptureContext): CapturedInlineSvgSnapshot {
  const entries: CapturedInlineSvg[] = [];
  for (const [captureNodeId, element] of elementsByCaptureNodeId.entries()) {
    if (element.tagName.toLowerCase() !== "svg") continue;
    const source = element.outerHTML;
    const truncated = source.length > BROWSER_CAPTURE_LIMITS.maxInlineSvgBytes;
    const outerHTML = source.slice(0, BROWSER_CAPTURE_LIMITS.maxInlineSvgBytes);
    const safety = inspectInlineSvgSafety(outerHTML);
    if (safety.unsafe) context.addWarning({ code: "INLINE_SVG_UNSAFE", message: "Inline SVG contains unsupported or unsafe features.", severity: "WARNING", sourceNodeId: captureNodeId });
    entries.push({
      captureNodeId,
      namespace: element.namespaceURI,
      outerHTML,
      referencedAssetUrls: extractHrefUrls(element),
      safety,
      truncated,
      ...(element.getAttribute("viewBox") ? { viewBox: element.getAttribute("viewBox") || "" } : {}),
      ...(element.getAttribute("width") ? { width: element.getAttribute("width") || "" } : {}),
      ...(element.getAttribute("height") ? { height: element.getAttribute("height") || "" } : {})
    });
  }
  return { entries };
}

function extractHrefUrls(element: Element): string[] {
  return Array.from(element.querySelectorAll("image,use"))
    .map((node) => node.getAttribute("href") || node.getAttribute("xlink:href") || "")
    .filter(Boolean)
    .slice(0, 50);
}
