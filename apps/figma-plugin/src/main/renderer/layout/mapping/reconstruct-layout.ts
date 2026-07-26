import type { DesignIrColor, DesignIrFrameNode, DesignIrNode } from "@aio/design-ir";
import { mapLayoutMode, LAYOUT_POLICY } from "../contracts/layout-mapping.js";
import type { FigmaRendererAdapter, RendererNode } from "../../runtime/node-types.js";

export interface LayoutReconstructionMetrics {
  rootWidth?: number;
  bodyWidth?: number;
  mainWidth?: number;
  rightRailWidth?: number;
  mainRailRatio?: number;
  sections: Array<{ irNodeId: string; top: number; bottom: number; parentHeight: number; contentHeight: number; childTotalHeight: number; gapTotal: number; divergencePercent: number }>;
  text: Array<{ irNodeId: string; width: number; measuredHeight: number; divergencePercent: number }>;
  corrections: string[];
  centeredControlCount: number;
  textOverflowCount: number;
  textOverlapCount: number;
  gridContainerCount: number;
  gridChildCount: number;
  gridGeometryDivergence: number;
}

interface ReconstructionOptions {
  adapter: FigmaRendererAdapter;
  resolve: (irNodeId: string) => RendererNode | null;
}

function isFlowChild(parent: DesignIrFrameNode, child: DesignIrNode): boolean {
  const positionedChildIds = Array.isArray(parent.layout.positionedChildIds) ? parent.layout.positionedChildIds : [];
  return !positionedChildIds.includes(child.id) && child.renderPolicy !== "ABSOLUTE_FALLBACK";
}

function finiteSize(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function relativeX(node: DesignIrNode, parent: DesignIrNode): number {
  return node.geometry.coordinateSpace === "PARENT" ? node.geometry.x : node.geometry.x - parent.geometry.x;
}

function relativeY(node: DesignIrNode, parent: DesignIrNode): number {
  return node.geometry.coordinateSpace === "PARENT" ? node.geometry.y : node.geometry.y - parent.geometry.y;
}

function applySize(adapter: FigmaRendererAdapter, target: RendererNode, width: number, height: number): void {
  if (width > 0 && height > 0 && (Math.abs(target.width - width) > LAYOUT_POLICY.geometryTolerance || Math.abs(target.height - height) > LAYOUT_POLICY.geometryTolerance)) {
    adapter.resizeNode(target.id, width, height);
  }
}

function estimatedNoWrapTextWidth(node: Extract<DesignIrNode, { nodeType: "TEXT" }>): number {
  const fontSize = Number.isFinite(node.typography.fontSize) && node.typography.fontSize ? node.typography.fontSize : 16;
  const compact = node.text.replace(/\s+/g, " ").trim();
  if (!compact || compact.length > 40) return 0;
  return Math.ceil([...compact].reduce((width, char) => width + (char.charCodeAt(0) > 127 ? fontSize : fontSize * 0.56), 0) + fontSize * 0.5);
}

function needsGeometryFallback(frame: DesignIrFrameNode, mapping: ReturnType<typeof mapLayoutMode>, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>): boolean {
  if (mapping.layoutMode === "NONE" || childTargets.length === 0) return false;
  return childTargets.some(({ ir, target }) => {
    const expectedX = relativeX(ir, frame);
    const expectedY = relativeY(ir, frame);
    const positionDelta = Math.max(Math.abs(target.x - expectedX), Math.abs(target.y - expectedY));
    const widthDelta = Math.abs(target.width - ir.geometry.width);
    return positionDelta > 8 || widthDelta > 8;
  });
}

function childWidth(parent: DesignIrFrameNode, child: DesignIrNode, availableWidth: number, horizontal: boolean, totalWidth: number): number {
  if (horizontal && totalWidth > 0) return Math.max(1, availableWidth * (child.geometry.width / totalWidth));
  if ("sizing" in child && child.sizing.horizontal.mode === "STRETCH") return Math.max(1, availableWidth);
  return Math.max(1, Math.min(availableWidth, child.geometry.width));
}

function isSingleTextControl(frame: DesignIrFrameNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>): childTargets is Array<{ ir: Extract<DesignIrNode, { nodeType: "TEXT" }>; target: RendererNode }> {
  if (childTargets.length !== 1 || childTargets[0]?.ir.nodeType !== "TEXT") return false;
  const tag = frame.semantic?.tagName?.toLowerCase();
  if (tag !== "a" && tag !== "button" && tag !== "span") return false;
  const radius = Math.max(frame.visual.radius.topLeft, frame.visual.radius.topRight, frame.visual.radius.bottomRight, frame.visual.radius.bottomLeft);
  const hasChrome = hasNonWhiteSolidBackground(frame) || Object.values(frame.visual.border.width).some((value) => value > 0);
  const roundedPill = hasChrome && radius >= frame.geometry.height / 2 - 1;
  const controlHeight = frame.geometry.height >= 24 && frame.geometry.height <= 64;
  return controlHeight && (tag === "button" || roundedPill || hasChrome);
}

function isPlainInlineTextWrapper(frame: DesignIrFrameNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>): boolean {
  const tag = frame.semantic?.tagName?.toLowerCase();
  if (tag !== "span" && tag !== "strong" && tag !== "em" && tag !== "b" && tag !== "i" && tag !== "small" && tag !== "a") return false;
  if (hasNonWhiteSolidBackground(frame) || Object.values(frame.visual.border.width).some((value) => value > 0)) return false;
  return childTargets.length > 0 && childTargets.every((entry) => entry.ir.nodeType === "TEXT" || (entry.ir.nodeType === "FRAME" && isInlineTextTag(entry.ir)));
}

function hasNonWhiteSolidBackground(frame: DesignIrFrameNode): boolean {
  return frame.visual.backgrounds.some((layer) => layer.type === "SOLID" && layer.color && isNonWhiteVisibleColor(layer.color));
}

function isNonWhiteVisibleColor(color: DesignIrColor): boolean {
  return color.a > 0.01 && (Math.abs(color.r - 1) > 0.01 || Math.abs(color.g - 1) > 0.01 || Math.abs(color.b - 1) > 0.01);
}

function isInlineTextTag(node: DesignIrFrameNode): boolean {
  const tag = node.semantic?.tagName?.toLowerCase();
  return tag === "span" || tag === "strong" || tag === "em" || tag === "b" || tag === "i" || tag === "small" || tag === "a";
}

function reconstructInlineTextRun(target: RendererNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>, metrics: LayoutReconstructionMetrics): void {
  target.layoutMode = "HORIZONTAL";
  target.layoutWrap = "NO_WRAP";
  target.itemSpacing = 0;
  target.primaryAxisAlignItems = "MIN";
  target.counterAxisAlignItems = "CENTER";
  target.primaryAxisSizingMode = "AUTO";
  target.counterAxisSizingMode = "FIXED";
  let cursorX = 0;
  for (const entry of childTargets) {
    entry.target.layoutPositioning = "AUTO";
    entry.target.x = cursorX;
    entry.target.y = Math.max(0, (target.height - entry.target.height) / 2);
    cursorX += Math.max(0, entry.target.width);
  }
  metrics.corrections.push("INLINE_TEXT_RUN_RECONSTRUCTED");
}

function isPaddedTextBox(frame: DesignIrFrameNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>): childTargets is Array<{ ir: Extract<DesignIrNode, { nodeType: "TEXT" }>; target: RendererNode }> {
  if (childTargets.length !== 1 || childTargets[0]?.ir.nodeType !== "TEXT") return false;
  const tag = frame.semantic?.tagName?.toLowerCase();
  if (tag !== "p" && tag !== "div" && tag !== "span") return false;
  const hasBackground = frame.visual.backgrounds.some((layer) => layer.type === "SOLID" && layer.color && layer.color.a > 0.01);
  const padding = frame.layout.padding;
  return hasBackground && (padding.left > 0 || padding.right > 0 || padding.top > 0 || padding.bottom > 0);
}

function reconstructPaddedTextBox(adapter: FigmaRendererAdapter, frame: DesignIrFrameNode, target: RendererNode, child: { ir: Extract<DesignIrNode, { nodeType: "TEXT" }>; target: RendererNode }, metrics: LayoutReconstructionMetrics): void {
  target.layoutMode = "VERTICAL";
  target.layoutWrap = "NO_WRAP";
  target.primaryAxisAlignItems = "CENTER";
  target.counterAxisAlignItems = "MIN";
  target.primaryAxisSizingMode = "FIXED";
  target.counterAxisSizingMode = "FIXED";
  child.target.layoutPositioning = "AUTO";
  child.target.x = Math.max(0, frame.layout.padding.left);
  child.target.y = Math.max(0, frame.layout.padding.top);
  const textWidth = Math.max(1, target.width - frame.layout.padding.left - frame.layout.padding.right);
  applySize(adapter, child.target, textWidth, Math.max(1, child.target.height));
  if (child.target.type === "TEXT") {
    child.target.textAlignHorizontal = child.ir.typography.textAlign.toLowerCase() === "center" ? "CENTER" : child.ir.typography.textAlign.toLowerCase() === "right" ? "RIGHT" : "LEFT";
  }
  metrics.corrections.push("PADDED_TEXT_BOX_INSET_APPLIED");
}

function measuredGap(frame: DesignIrFrameNode, previous: DesignIrNode, next: DesignIrNode, axis: "x" | "y"): number {
  const previousStart = axis === "x" ? relativeX(previous, frame) : relativeY(previous, frame);
  const nextStart = axis === "x" ? relativeX(next, frame) : relativeY(next, frame);
  const previousSize = axis === "x" ? previous.geometry.width : previous.geometry.height;
  return Math.max(0, nextStart - (previousStart + previousSize));
}

function measuredPrimaryGap(frame: DesignIrFrameNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>, axis: "x" | "y", fallback: number): number {
  const ordered = childTargets.slice().sort((a, b) => (axis === "x" ? relativeX(a.ir, frame) - relativeX(b.ir, frame) : relativeY(a.ir, frame) - relativeY(b.ir, frame)));
  const gaps: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) gaps.push(measuredGap(frame, ordered[index - 1]!.ir, ordered[index]!.ir, axis));
  const positive = gaps.filter((value) => value > 0);
  return positive.length ? Math.max(fallback, Math.min(...positive)) : fallback;
}

function overflowsWidth(target: RendererNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>, paddingLeft: number, paddingRight: number, gap: number): boolean {
  const renderedOverflow = childTargets.some((entry) => entry.target.x + entry.target.width > target.width - paddingRight + LAYOUT_POLICY.geometryTolerance);
  const measuredWidth = childTargets.reduce((sum, entry) => sum + Math.max(entry.ir.geometry.width, entry.target.width), 0) + Math.max(0, childTargets.length - 1) * gap + paddingLeft + paddingRight;
  return renderedOverflow || measuredWidth > target.width + LAYOUT_POLICY.geometryTolerance;
}

function reconstructWrappingRow(adapter: FigmaRendererAdapter, frame: DesignIrFrameNode, target: RendererNode, childTargets: Array<{ ir: DesignIrNode; target: RendererNode }>, paddingLeft: number, paddingTop: number, paddingRight: number, paddingBottom: number, fallbackGap: number, metrics: LayoutReconstructionMetrics): void {
  const gap = measuredPrimaryGap(frame, childTargets, "x", fallbackGap);
  const rowGap = Math.max(8, measuredPrimaryGap(frame, childTargets, "y", 0));
  const maxX = Math.max(1, target.width - paddingRight);
  let cursorX = paddingLeft;
  let cursorY = Math.max(paddingTop, Math.min(...childTargets.map((entry) => Math.max(0, relativeY(entry.ir, frame)))));
  let rowHeight = 0;
  for (const entry of childTargets) {
    const width = Math.min(entry.target.width, Math.max(1, maxX - paddingLeft));
    if (cursorX > paddingLeft && cursorX + width > maxX + LAYOUT_POLICY.geometryTolerance) {
      cursorX = paddingLeft;
      cursorY += rowHeight + rowGap;
      rowHeight = 0;
    }
    entry.target.layoutPositioning = "AUTO";
    entry.target.x = cursorX;
    entry.target.y = cursorY;
    applySize(adapter, entry.target, width, Math.max(1, entry.target.height));
    cursorX += width + gap;
    rowHeight = Math.max(rowHeight, entry.target.height);
  }
  const desiredHeight = cursorY + rowHeight + paddingBottom;
  if (desiredHeight > target.height + LAYOUT_POLICY.geometryTolerance) applySize(adapter, target, target.width, desiredHeight);
  target.layoutMode = "HORIZONTAL";
  target.layoutWrap = "WRAP";
  target.itemSpacing = gap;
  target.counterAxisSpacing = rowGap;
  metrics.corrections.push("OVERFLOWING_ROW_WRAPPED");
}

function reconstructSingleTextControl(adapter: FigmaRendererAdapter, frame: DesignIrFrameNode, target: RendererNode, child: { ir: Extract<DesignIrNode, { nodeType: "TEXT" }>; target: RendererNode }, metrics: LayoutReconstructionMetrics): void {
  const fontSize = Number.isFinite(child.ir.typography.fontSize) && child.ir.typography.fontSize ? child.ir.typography.fontSize : 14;
  const radius = Math.max(frame.visual.radius.topLeft, frame.visual.radius.topRight, frame.visual.radius.bottomRight, frame.visual.radius.bottomLeft);
  const hasChrome = frame.visual.backgrounds.length > 0 || Object.values(frame.visual.border.width).some((value) => value > 0);
  const roundedPill = hasChrome && radius >= frame.geometry.height / 2 - 1;
  const horizontalPadding = Math.max(frame.layout.padding.left + frame.layout.padding.right, Math.ceil(fontSize * 2));
  const desiredWidth = Math.max(1, Math.ceil(Math.max(child.target.width, estimatedNoWrapTextWidth(child.ir)) + horizontalPadding));
  if (roundedPill && target.width > desiredWidth + 16) adapter.resizeNode(target.id, desiredWidth, Math.max(1, target.height));
  if (Number.isFinite(frame.geometry.height) && frame.geometry.height > 0 && Math.abs(target.height - frame.geometry.height) > LAYOUT_POLICY.geometryTolerance) {
    adapter.resizeNode(target.id, Math.max(1, target.width), frame.geometry.height);
  }
  target.layoutMode = "HORIZONTAL";
  target.layoutWrap = "NO_WRAP";
  target.primaryAxisAlignItems = "CENTER";
  target.counterAxisAlignItems = "CENTER";
  target.primaryAxisSizingMode = "FIXED";
  target.counterAxisSizingMode = "FIXED";
  child.target.layoutPositioning = "AUTO";
  child.target.x = Math.max(0, (target.width - child.target.width) / 2);
  child.target.y = Math.max(0, (target.height - child.target.height) / 2);
  if (child.target.type === "TEXT") {
    child.target.textAlignHorizontal = "CENTER";
    child.target.textAlignVertical = "CENTER";
  }
  metrics.centeredControlCount += 1;
  metrics.corrections.push("SINGLE_TEXT_CONTROL_CENTERED");
}

function reconstructNode(node: DesignIrNode, target: RendererNode, parent: DesignIrNode | undefined, options: ReconstructionOptions, metrics: LayoutReconstructionMetrics): void {
  if (node.nodeType === "TEXT") {
    const previousHeight = target.height;
    const previousWidth = target.width;
    const parentTarget = target.parent;
    const parentContentWidth = parent?.nodeType === "FRAME"
      ? Math.max(1, (parentTarget?.width ?? node.geometry.width) - parent.layout.padding.left - parent.layout.padding.right)
      : node.geometry.width;
    const verticalFlow = parent?.nodeType === "FRAME" && (parent.layout.mode === "VERTICAL" || parent.layout.mode === "WRAPPED_VERTICAL");
    const width = verticalFlow ? Math.max(parentContentWidth, estimatedNoWrapTextWidth(node)) : Math.max(finiteSize(node.geometry.width, target.width), estimatedNoWrapTextWidth(node));
    if (!verticalFlow && width > previousWidth + LAYOUT_POLICY.geometryTolerance) {
      const align = node.typography.textAlign.toLowerCase();
      if (align === "center") target.x -= (width - previousWidth) / 2;
      else if (align === "right" || align === "end") target.x -= width - previousWidth;
    }
    if (verticalFlow && target.type === "TEXT") {
      (target as RendererNode & { textAutoResize?: string }).textAutoResize = "HEIGHT";
    }
    applySize(options.adapter, target, width, Math.max(1, target.height));
    if (parentTarget && target.width > parentTarget.width + LAYOUT_POLICY.geometryTolerance) {
      metrics.textOverflowCount += 1;
      metrics.corrections.push("TEXT_WIDTH_EXCEEDS_PARENT");
    }
    metrics.text.push({ irNodeId: node.id, width: target.width, measuredHeight: target.height, divergencePercent: node.geometry.height > 0 ? Math.abs(target.height - node.geometry.height) / node.geometry.height * 100 : 0 });
    if (Math.abs(previousHeight - target.height) > LAYOUT_POLICY.geometryTolerance) metrics.corrections.push("TEXT_HEIGHT_REMEASURED");
    return;
  }
  if (!(node.nodeType === "FRAME" || node.nodeType === "DOCUMENT") || !("children" in node)) return;
  const frame = node.nodeType === "FRAME" ? node : undefined;
  const mapping = frame ? mapLayoutMode(frame) : undefined;
  if (frame?.layout.mode === "GRID_REFERENCE") {
    metrics.gridContainerCount += 1;
    metrics.gridChildCount += safeChildren(frame).length;
  }
  const flow = frame ? safeChildren(frame).filter((child) => isFlowChild(frame, child)) : safeChildren(node);
  const childTargets = flow.map((child) => ({ ir: child, target: options.resolve(child.id) })).filter((entry): entry is { ir: DesignIrNode; target: RendererNode } => Boolean(entry.target));
  const horizontal = mapping?.layoutMode === "HORIZONTAL";
  const geometryFallback = frame && mapping ? needsGeometryFallback(frame, mapping, childTargets) : false;
  if (geometryFallback && target.type === "FRAME") {
    target.layoutMode = "NONE";
    target.layoutWrap = "NO_WRAP";
  }
  const paddingLeft = mapping?.paddingLeft ?? 0;
  const paddingRight = mapping?.paddingRight ?? 0;
  const paddingTop = mapping?.paddingTop ?? 0;
  const paddingBottom = mapping?.paddingBottom ?? 0;
  const gap = mapping?.itemSpacing ?? 0;
  const availableWidth = Math.max(1, target.width - paddingLeft - paddingRight - (horizontal ? gap * Math.max(0, childTargets.length - 1) : 0));
  const totalWidth = childTargets.reduce((sum, entry) => sum + Math.max(0, entry.ir.geometry.width), 0);
  let childTotalHeight = 0;
  for (const entry of childTargets) {
    const { ir, target: childTarget } = entry;
    const freeform = mapping?.layoutMode === "NONE" || geometryFallback;
    const width = freeform ? finiteSize(ir.geometry.width, childTarget.width) : childWidth(frame ?? (node as never), ir, availableWidth, horizontal, totalWidth);
    const height = freeform ? finiteSize(ir.geometry.height, childTarget.height) : finiteSize(childTarget.height, ir.geometry.height);
    applySize(options.adapter, childTarget, width, height);
    reconstructNode(ir, childTarget, node, options, metrics);
    if (!horizontal) childTotalHeight += childTarget.height;
  }
  const compactTextControl = frame && isSingleTextControl(frame, childTargets) ? childTargets[0] : undefined;
  const inlineTextRun = frame && !compactTextControl && isPlainInlineTextWrapper(frame, childTargets);
  const paddedTextBox = frame && !compactTextControl && !inlineTextRun && isPaddedTextBox(frame, childTargets) ? childTargets[0] : undefined;
  if (frame && compactTextControl) reconstructSingleTextControl(options.adapter, frame, target, compactTextControl, metrics);
  if (frame && inlineTextRun) reconstructInlineTextRun(target, childTargets, metrics);
  if (frame && paddedTextBox) reconstructPaddedTextBox(options.adapter, frame, target, paddedTextBox, metrics);
  const shouldWrapOverflowingRow = frame && horizontal && !compactTextControl && !inlineTextRun && childTargets.length > 1 && overflowsWidth(target, childTargets, paddingLeft, paddingRight, gap);
  if (frame && shouldWrapOverflowingRow) reconstructWrappingRow(options.adapter, frame, target, childTargets, paddingLeft, paddingTop, paddingRight, paddingBottom, gap, metrics);
  let cursorY = paddingTop;
  for (const entry of childTargets) {
    const { ir, target: childTarget } = entry;
    if (compactTextControl && ir.id === compactTextControl.ir.id) continue;
    if (inlineTextRun) continue;
    if (paddedTextBox && ir.id === paddedTextBox.ir.id) continue;
    if (shouldWrapOverflowingRow) continue;
    if (frame && !isFlowChild(frame, ir)) {
      childTarget.x = relativeX(ir, frame);
      childTarget.y = relativeY(ir, frame);
    } else if (frame && (mapping?.layoutMode === "NONE" || geometryFallback)) {
      childTarget.x = relativeX(ir, frame);
      childTarget.y = relativeY(ir, frame);
    } else if (!horizontal) {
      childTarget.x = paddingLeft;
      const measuredY = frame ? relativeY(ir, frame) : cursorY;
      childTarget.y = Math.max(cursorY, measuredY);
      cursorY = childTarget.y + childTarget.height + gap;
    }
  }
  const freeformContentBottom = mapping?.layoutMode === "NONE"
    ? Math.max(0, ...childTargets.map((entry) => entry.target.y + entry.target.height)) + paddingBottom
    : 0;
  const contentHeight = horizontal
    ? Math.max(0, ...childTargets.map((entry) => entry.target.height)) + paddingTop + paddingBottom
    : childTotalHeight + paddingTop + paddingBottom + gap * Math.max(0, childTargets.length - 1);
  const divergencePercent = node.geometry.height > 0 ? Math.abs(target.height - node.geometry.height) / node.geometry.height * 100 : 0;
  if (frame) {
    const desiredHeight = mapping?.layoutMode === "NONE" || geometryFallback ? freeformContentBottom : contentHeight;
    const shouldReconcileHeight = desiredHeight > 0 && (
      desiredHeight > target.height + LAYOUT_POLICY.geometryTolerance ||
      (frame.sizing.vertical.mode !== "FIXED" && target.height > desiredHeight + LAYOUT_POLICY.geometryTolerance)
    );
    if (shouldReconcileHeight && (mapping?.layoutMode === "VERTICAL" || mapping?.layoutMode === "NONE" || geometryFallback)) {
      applySize(options.adapter, target, target.width, desiredHeight);
      metrics.corrections.push(mapping?.layoutMode === "NONE" || geometryFallback ? "FREEFORM_CONTENT_HEIGHT_RECONCILED" : "PARENT_CONTENT_HEIGHT_RECONCILED");
    }
    if (geometryFallback) metrics.corrections.push("AUTO_LAYOUT_GEOMETRY_FALLBACK_USED");
    metrics.sections.push({ irNodeId: node.id, top: target.y, bottom: target.y + target.height, parentHeight: target.height, contentHeight, childTotalHeight, gapTotal: gap * Math.max(0, childTargets.length - 1), divergencePercent });
    if (frame?.layout.mode === "GRID_REFERENCE") metrics.gridGeometryDivergence += divergencePercent;
    if (node.name.toLowerCase() === "body" || node.semantic?.tagName?.toLowerCase() === "body") metrics.bodyWidth = target.width;
    if (node.name.toLowerCase().includes("main") || node.semantic?.tagName?.toLowerCase() === "main") metrics.mainWidth = target.width;
    if (node.name.toLowerCase().includes("rail") || node.semantic?.tagName?.toLowerCase() === "aside") metrics.rightRailWidth = target.width;
  } else {
    metrics.rootWidth = target.width;
  }
  if (metrics.mainWidth && metrics.rightRailWidth) metrics.mainRailRatio = metrics.mainWidth / metrics.rightRailWidth;
}

export function reconstructLayout(root: DesignIrNode, rootTarget: RendererNode, options: ReconstructionOptions): LayoutReconstructionMetrics {
  const metrics: LayoutReconstructionMetrics = { sections: [], text: [], corrections: [], centeredControlCount: 0, textOverflowCount: 0, textOverlapCount: 0, gridContainerCount: 0, gridChildCount: 0, gridGeometryDivergence: 0 };
  reconstructNode(root, rootTarget, undefined, options, metrics);
  metrics.textOverlapCount = countTextSiblingOverlaps(rootTarget);
  if (metrics.textOverlapCount > 0) metrics.corrections.push("TEXT_SIBLING_OVERLAP_DETECTED");
  metrics.corrections = [...new Set(metrics.corrections)];
  return metrics;
}

function countTextSiblingOverlaps(root: RendererNode): number {
  let count = 0;
  const visit = (node: RendererNode) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const textChildren = children.filter((child) => child.type === "TEXT" && child.visible !== false);
    for (let i = 0; i < textChildren.length; i += 1) {
      for (let j = i + 1; j < textChildren.length; j += 1) {
        if (rectsOverlap(textChildren[i]!, textChildren[j]!)) count += 1;
      }
    }
    for (const child of children) visit(child);
  };
  visit(root);
  return count;
}

function safeChildren(node: DesignIrNode): DesignIrNode[] {
  return "children" in node && Array.isArray(node.children) ? node.children : [];
}

function rectsOverlap(a: RendererNode, b: RendererNode): boolean {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right - left > LAYOUT_POLICY.geometryTolerance && bottom - top > LAYOUT_POLICY.geometryTolerance;
}
