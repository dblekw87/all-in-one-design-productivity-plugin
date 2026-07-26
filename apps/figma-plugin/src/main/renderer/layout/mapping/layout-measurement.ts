import type { DesignIrFrameNode, DesignIrNode } from "@aio/design-ir";
import type { RendererNode } from "../../runtime/node-types.js";
import { LAYOUT_POLICY, mapLayoutMode } from "../contracts/layout-mapping.js";

export interface LayoutChildMeasurement {
  irNodeId: string;
  irWidth: number;
  actualWidth: number;
  widthRatio: number;
}

export interface LayoutMeasurement {
  irNodeId: string;
  beforeParentWidth: number;
  beforeParentHeight: number;
  beforeChildTotalContentWidth: number;
  beforeChildTotalContentHeight: number;
  parentWidth: number;
  parentHeight: number;
  childTotalContentWidth: number;
  childTotalContentHeight: number;
  autoLayoutGap: number;
  expectedWidth: number;
  expectedHeight: number;
  widthDivergence: number;
  heightDivergence: number;
  fixedHeightOversize: number;
  children: LayoutChildMeasurement[];
  correctionCodes: string[];
}

function flowChildren(node: DesignIrFrameNode): DesignIrNode[] {
  const children = Array.isArray(node.children) ? node.children : [];
  const positionedChildIds = Array.isArray(node.layout.positionedChildIds) ? node.layout.positionedChildIds : [];
  return children.filter((child) => !positionedChildIds.includes(child.id) && child.renderPolicy !== "ABSOLUTE_FALLBACK");
}

export function measureLayout(node: DesignIrFrameNode, target: RendererNode): LayoutMeasurement {
  const mapping = mapLayoutMode(node);
  const children = flowChildren(node);
  const gap = mapping.layoutMode === "NONE" ? 0 : mapping.itemSpacing;
  const horizontal = mapping.layoutMode === "HORIZONTAL";
  const figmaChildren = Array.isArray(target.children) ? target.children : [];
  const irChildren = Array.isArray(node.children) ? node.children : [];
  const childNodes = children.map((child) => ({ ir: child, figma: figmaChildren[irChildren.findIndex((item) => item.id === child.id)] })).filter((item): item is { ir: DesignIrNode; figma: RendererNode } => Boolean(item.figma));
  const childTotalContentWidth = horizontal ? childNodes.reduce((sum, item) => sum + item.figma.width, 0) + Math.max(0, childNodes.length - 1) * gap : Math.max(0, ...childNodes.map((item) => item.figma.width));
  const childTotalContentHeight = horizontal ? Math.max(0, ...childNodes.map((item) => item.figma.height)) : childNodes.reduce((sum, item) => sum + item.figma.height, 0) + Math.max(0, childNodes.length - 1) * gap;
  const expectedWidth = childTotalContentWidth + mapping.paddingLeft + mapping.paddingRight;
  const expectedHeight = childTotalContentHeight + mapping.paddingTop + mapping.paddingBottom;
  const widthDivergence = Math.abs(target.width - node.geometry.width);
  const heightDivergence = Math.abs(target.height - node.geometry.height);
  const fixedHeightOversize = node.sizing.vertical.mode === "FIXED" && node.layout.confidence >= 0.75 ? Math.max(0, target.height - expectedHeight - LAYOUT_POLICY.geometryTolerance) : 0;
  return {
    irNodeId: node.id, beforeParentWidth: target.width, beforeParentHeight: target.height,
    beforeChildTotalContentWidth: childTotalContentWidth, beforeChildTotalContentHeight: childTotalContentHeight,
    parentWidth: target.width, parentHeight: target.height,
    childTotalContentWidth, childTotalContentHeight, autoLayoutGap: gap,
    expectedWidth, expectedHeight, widthDivergence, heightDivergence, fixedHeightOversize,
    children: childNodes.map(({ ir, figma }) => ({ irNodeId: ir.id, irWidth: ir.geometry.width, actualWidth: figma.width, widthRatio: ir.geometry.width > 0 ? figma.width / ir.geometry.width : 1 })),
    correctionCodes: fixedHeightOversize > 0 ? ["FIXED_HEIGHT_HUG_FALLBACK"] : [],
  };
}
