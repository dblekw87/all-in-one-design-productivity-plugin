import { CaptureNodeIdFactory } from "../dom/create-capture-node-id.js";
import { PSEUDO_STYLE_ALLOWLIST } from "./pseudo-style-allowlist.js";

export interface CapturedPseudoElement {
  captureNodeId: string;
  parentCaptureNodeId: string;
  pseudoType: "before" | "after";
  properties: Record<string, string>;
}

export interface CapturedPseudoSnapshot {
  entries: CapturedPseudoElement[];
}

export function capturePseudoElements(elementsByCaptureNodeId: Map<string, Element>): CapturedPseudoSnapshot {
  const ids = new CaptureNodeIdFactory();
  const entries: CapturedPseudoElement[] = [];
  for (const [captureNodeId, element] of elementsByCaptureNodeId.entries()) {
    for (const pseudoType of ["before", "after"] as const) {
      const style = window.getComputedStyle(element, `::${pseudoType}`);
      if (!pseudoExists(style)) continue;
      const properties: Record<string, string> = {};
      for (const property of PSEUDO_STYLE_ALLOWLIST) properties[property] = style.getPropertyValue(property);
      entries.push({ captureNodeId: ids.pseudo(captureNodeId, pseudoType), parentCaptureNodeId: captureNodeId, pseudoType, properties });
    }
  }
  return { entries };
}

function pseudoExists(style: CSSStyleDeclaration): boolean {
  const content = style.getPropertyValue("content");
  if (style.display === "none") return false;
  return Boolean(content && content !== "none" && content !== "normal") || style.getPropertyValue("background-image") !== "none" || style.getPropertyValue("mask-image") !== "none";
}
