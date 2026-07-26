import { STYLE_PROPERTY_ALLOWLIST } from "./style-property-allowlist.js";

export interface CapturedStyleEntry {
  captureNodeId: string;
  properties: Record<string, string>;
  evidence: {
    isFlexContainer: boolean;
    isGridContainer: boolean;
    visibleChildCount: number;
    flexChildCount: number;
    gridChildCount: number;
  };
}

export interface CapturedStyleSnapshot {
  entries: CapturedStyleEntry[];
}

export function captureComputedStyle(captureNodeId: string, element: Element): CapturedStyleEntry {
  const style = window.getComputedStyle(element);
  const properties: Record<string, string> = {};
  for (const property of STYLE_PROPERTY_ALLOWLIST) {
    properties[property] = style.getPropertyValue(property);
  }
  const display = properties.display ?? "";
  const visibleChildren = Array.from(element.children).filter((child) => window.getComputedStyle(child).display !== "none");
  return {
    captureNodeId,
    properties,
    evidence: {
      isFlexContainer: display.includes("flex"),
      isGridContainer: display.includes("grid"),
      visibleChildCount: visibleChildren.length,
      flexChildCount: display.includes("flex") ? visibleChildren.length : 0,
      gridChildCount: display.includes("grid") ? visibleChildren.length : 0
    }
  };
}

export function captureComputedStyles(elementsByCaptureNodeId: Map<string, Element>): CapturedStyleSnapshot {
  return {
    entries: Array.from(elementsByCaptureNodeId.entries()).map(([captureNodeId, element]) => captureComputedStyle(captureNodeId, element))
  };
}
