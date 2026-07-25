import type { FrameLayoutMapping, ChildLayoutMapping } from "../layout/index.js";
import type { FrameVisualMapping } from "../visual/index.js";
import { reconcileGeometry, type GeometryReconciliation } from "../layout/mapping/reconcile-geometry.js";
import type { DesignIrNode } from "@aio/design-ir";
import type { RendererNode } from "./node-types";

export interface FigmaFrameAdapter {
  applyLayout(nodeId: string, mapping: FrameLayoutMapping): void;
  applyChildLayout(nodeId: string, mapping: ChildLayoutMapping): void;
  applyVisual(nodeId: string, mapping: FrameVisualMapping): void;
  applyClipping(nodeId: string, clipsContent: boolean): void;
  reconcileGeometry(nodeId: string, node: DesignIrNode): GeometryReconciliation;
}

function getFrame(id: string): FrameNode {
  const node = figma.getNodeById(id);
  if (!node || node.type !== "FRAME") throw new Error("Frame node is unavailable.");
  return node;
}

export function createProductionFigmaFrameAdapter(): FigmaFrameAdapter {
  return {
    applyLayout(nodeId, mapping) {
      const node = getFrame(nodeId);
      node.layoutMode = mapping.layoutMode;
      if (mapping.layoutMode !== "NONE") {
        node.layoutWrap = mapping.layoutWrap;
        node.itemSpacing = mapping.itemSpacing;
        if (mapping.counterAxisSpacing !== undefined) node.counterAxisSpacing = mapping.counterAxisSpacing;
        node.paddingTop = mapping.paddingTop;
        node.paddingRight = mapping.paddingRight;
        node.paddingBottom = mapping.paddingBottom;
        node.paddingLeft = mapping.paddingLeft;
        node.primaryAxisAlignItems = mapping.primaryAxisAlignItems as never;
        node.counterAxisAlignItems = mapping.counterAxisAlignItems as never;
        node.primaryAxisSizingMode = mapping.primaryAxisSizingMode;
        node.counterAxisSizingMode = mapping.counterAxisSizingMode;
      }
    },
    applyChildLayout(nodeId, mapping) {
      const node = figma.getNodeById(nodeId) as (SceneNode & Partial<FrameNode>) | null;
      if (!node) throw new Error("Child node is unavailable.");
      if (mapping.parentAutoLayout && "layoutPositioning" in node) (node as FrameNode).layoutPositioning = mapping.layoutPositioning;
      if (mapping.parentAutoLayout && "layoutAlign" in node) (node as FrameNode).layoutAlign = mapping.layoutAlign;
      if (mapping.parentAutoLayout && "layoutGrow" in node) (node as FrameNode).layoutGrow = mapping.layoutGrow;
      if (mapping.absolute) { node.x = mapping.x; node.y = mapping.y; }
    },
    applyVisual(nodeId, mapping) {
      const node = getFrame(nodeId);
      node.fills = mapping.fills as never;
      node.strokes = mapping.strokes as never;
      node.strokeWeight = mapping.strokeWeight;
      node.topLeftRadius = mapping.cornerRadii[0];
      node.topRightRadius = mapping.cornerRadii[1];
      node.bottomRightRadius = mapping.cornerRadii[2];
      node.bottomLeftRadius = mapping.cornerRadii[3];
      node.effects = mapping.effects as never;
      node.opacity = mapping.opacity;
      node.visible = mapping.visible;
    },
    applyClipping(nodeId, clipsContent) {
      getFrame(nodeId).clipsContent = clipsContent;
    },
    reconcileGeometry(nodeId, node) {
      return reconcileGeometry(getFrame(nodeId) as unknown as RendererNode, node);
    },
  };
}

export function createNoopFigmaFrameAdapter(): FigmaFrameAdapter {
  return {
    applyLayout() { /* no-op for legacy adapters */ },
    applyChildLayout() { /* no-op for legacy adapters */ },
    applyVisual() { /* no-op for legacy adapters */ },
    applyClipping() { /* no-op for legacy adapters */ },
    reconcileGeometry() { return { diverged: false, widthDelta: 0, heightDelta: 0 }; },
  };
}
