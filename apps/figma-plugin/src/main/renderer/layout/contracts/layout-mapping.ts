import type { DesignIrFrameNode, DesignIrNode, DesignIrSizingMode } from "@aio/design-ir";
import { toParentRelativeBounds } from "./geometry-mapping.js";

export type RendererLayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";
export type RendererLayoutWrap = "NO_WRAP" | "WRAP";
export type RendererAxisAlign = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN" | "BASELINE";
export type RendererLayoutAlign = "INHERIT" | "STRETCH";
export type RendererLayoutPositioning = "AUTO" | "ABSOLUTE";
export type RendererSizingMode = "AUTO" | "FIXED";

export interface FrameLayoutMapping {
  layoutMode: RendererLayoutMode;
  layoutWrap: RendererLayoutWrap;
  itemSpacing: number;
  counterAxisSpacing?: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  primaryAxisAlignItems: RendererAxisAlign;
  counterAxisAlignItems: RendererAxisAlign;
  primaryAxisSizingMode: RendererSizingMode;
  counterAxisSizingMode: RendererSizingMode;
  warningCodes: string[];
}

export interface ChildLayoutMapping {
  parentAutoLayout: boolean;
  layoutAlign: RendererLayoutAlign;
  layoutGrow: number;
  absolute: boolean;
  layoutPositioning: RendererLayoutPositioning;
  x: number;
  y: number;
  width?: number;
  height?: number;
  warningCodes: string[];
}

export const LAYOUT_POLICY = {
  lowConfidenceThreshold: 0.5,
  inferredConfidenceThreshold: 0.75,
  maxPadding: 10_000,
  maxGap: 10_000,
  geometryTolerance: 2,
} as const;

function finiteNonNegative(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sizingIsFixed(mode: DesignIrSizingMode): boolean {
  return mode === "FIXED" || mode === "RELATIVE" || mode === "UNKNOWN";
}

function axisSizing(mode: DesignIrSizingMode): RendererSizingMode {
  return sizingIsFixed(mode) ? "FIXED" : "AUTO";
}

export function mapLayoutMode(node: DesignIrFrameNode): FrameLayoutMapping {
  const warnings: string[] = [];
  let layoutMode: RendererLayoutMode;
  let layoutWrap: RendererLayoutWrap = "NO_WRAP";
  switch (node.layout.mode) {
    case "HORIZONTAL":
    case "WRAPPED_HORIZONTAL":
      layoutMode = "HORIZONTAL";
      if (node.layout.mode === "WRAPPED_HORIZONTAL") layoutWrap = "WRAP";
      break;
    case "VERTICAL":
    case "WRAPPED_VERTICAL":
      layoutMode = "VERTICAL";
      if (node.layout.mode === "WRAPPED_VERTICAL") warnings.push("LAYOUT_WRAP_UNSUPPORTED");
      break;
    case "GRID_REFERENCE":
      layoutMode = "NONE";
      warnings.push("GRID_FREEFORM_FALLBACK");
      break;
    case "FREEFORM":
    case "NONE":
      layoutMode = "NONE";
      break;
  }
  if (node.layout.confidence < LAYOUT_POLICY.lowConfidenceThreshold) {
    layoutMode = "NONE";
    layoutWrap = "NO_WRAP";
    warnings.push("LAYOUT_CONFIDENCE_LOW");
  } else if (node.layout.confidence < LAYOUT_POLICY.inferredConfidenceThreshold) {
    warnings.push("LAYOUT_CONFIDENCE_MEDIUM");
  }
  const primaryGap = Math.min(LAYOUT_POLICY.maxGap, finiteNonNegative(node.layout.gap?.primary));
  const crossGap = Math.min(LAYOUT_POLICY.maxGap, finiteNonNegative(node.layout.gap?.cross));
  const padding = node.layout.padding ?? node.box.padding;
  const mappedPadding = {
    top: Math.min(LAYOUT_POLICY.maxPadding, finiteNonNegative(padding.top)),
    right: Math.min(LAYOUT_POLICY.maxPadding, finiteNonNegative(padding.right)),
    bottom: Math.min(LAYOUT_POLICY.maxPadding, finiteNonNegative(padding.bottom)),
    left: Math.min(LAYOUT_POLICY.maxPadding, finiteNonNegative(padding.left)),
  };
  if ([padding.top, padding.right, padding.bottom, padding.left].some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)) warnings.push("PADDING_INVALID");
  if ([node.layout.gap?.primary, node.layout.gap?.cross].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) warnings.push("GAP_INVALID");
  return {
    layoutMode,
    layoutWrap,
    itemSpacing: primaryGap,
    ...(layoutWrap === "WRAP" ? { counterAxisSpacing: crossGap } : {}),
    paddingTop: mappedPadding.top,
    paddingRight: mappedPadding.right,
    paddingBottom: mappedPadding.bottom,
    paddingLeft: mappedPadding.left,
    primaryAxisAlignItems: mapPrimaryAlignment(node.layout.primaryAlignment, warnings),
    counterAxisAlignItems: mapCounterAlignment(node.layout.counterAlignment, warnings),
    primaryAxisSizingMode: axisSizing(node.sizing.horizontal.mode),
    counterAxisSizingMode: axisSizing(node.sizing.vertical.mode),
    warningCodes: warnings,
  };
}

export function mapChildLayout(node: DesignIrNode, parent: DesignIrFrameNode | undefined): ChildLayoutMapping {
  const warnings: string[] = [];
  const absolute = Boolean(parent?.layout.positionedChildIds.includes(node.id)) || node.renderPolicy === "ABSOLUTE_FALLBACK";
  if (node.renderPolicy === "ABSOLUTE_FALLBACK") warnings.push("ABSOLUTE_GEOMETRY_FALLBACK_USED");
  const parentAuto = parent ? mapLayoutMode(parent).layoutMode !== "NONE" : false;
  const crossStretch = parentAuto && parent?.layout.counterAlignment.toUpperCase() === "STRETCH";
  const mainStretch = parent !== undefined && parentAuto && parent.layout.mode !== "NONE" && (parent.layout.mode === "HORIZONTAL" || parent.layout.mode === "WRAPPED_HORIZONTAL")
    ? node.nodeType === "FRAME" && node.sizing.vertical.mode === "STRETCH"
    : node.nodeType === "FRAME" && node.sizing.horizontal.mode === "STRETCH";
  const bounds = toParentRelativeBounds(node, parent);
  return {
    parentAutoLayout: parentAuto,
    layoutAlign: crossStretch || mainStretch ? "STRETCH" : "INHERIT",
    layoutGrow: !absolute && mainStretch ? 1 : 0,
    absolute,
    layoutPositioning: absolute && parentAuto ? "ABSOLUTE" : "AUTO",
    x: bounds.x,
    y: bounds.y,
    ...(sizingIsFixed(node.nodeType === "FRAME" || node.nodeType === "TEXT" || node.nodeType === "IMAGE" || node.nodeType === "VECTOR" ? node.sizing.horizontal.mode : "FIXED") ? { width: bounds.width } : {}),
    ...(sizingIsFixed(node.nodeType === "FRAME" || node.nodeType === "TEXT" || node.nodeType === "IMAGE" || node.nodeType === "VECTOR" ? node.sizing.vertical.mode : "FIXED") ? { height: bounds.height } : {}),
    warningCodes: warnings,
  };
}

function mapPrimaryAlignment(value: string, warnings: string[]): RendererAxisAlign {
  switch (value.toUpperCase()) {
    case "CENTER": return "CENTER";
    case "END":
    case "FLEX-END": return "MAX";
    case "SPACE-BETWEEN": return "SPACE_BETWEEN";
    case "SPACE-AROUND":
    case "SPACE-EVENLY": warnings.push("ALIGNMENT_INVALID"); return "CENTER";
    default: return "MIN";
  }
}

function mapCounterAlignment(value: string, warnings: string[]): RendererAxisAlign {
  switch (value.toUpperCase()) {
    case "CENTER": return "CENTER";
    case "END":
    case "FLEX-END": return "MAX";
    case "BASELINE": warnings.push("ALIGNMENT_INVALID"); return "MIN";
    case "STRETCH": return "STRETCH" as RendererAxisAlign;
    default: return "MIN";
  }
}
