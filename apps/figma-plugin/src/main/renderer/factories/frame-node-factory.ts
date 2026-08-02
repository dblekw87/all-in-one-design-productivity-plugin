import type { DesignIrColor, DesignIrFrameNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import type { RenderContext } from "../runtime/render-context";
import type { RendererNode } from "../runtime/node-types";
import { applyNodeBasics } from "./factory-helpers";
import { mapLayoutMode } from "../layout/contracts/layout-mapping.js";
import { mapFrameVisual, mapFrameName } from "../visual/contracts/visual-mapping.js";
import { RendererError } from "../contracts/render-errors.js";
import { decodeDataUrl } from "../assets/decode-data-url.js";

export const frameNodeFactory: DesignIrNodeFactory<DesignIrFrameNode> = {
  nodeType: "FRAME",
  async create(node, context) {
    if (context.abortSignal.aborted) throw new RendererError("RENDER_CANCELLED", "Frame rendering was cancelled.", node.id);
    const target = context.adapter.createFrame();
    context.registerCreatedNode(node.id, target.id);
    applyNodeBasics(target, node, context);
    const layout = mapLayoutMode(node);
    const visual = mapFrameVisual(node);
    for (const code of [...layout.warningCodes, ...visual.warningCodes]) context.reportWarning({ code, message: "Frame mapping used a fallback or approximation.", irNodeId: node.id });
    context.reportProgress({ stage: "MAPPING_LAYOUT", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Mapping frame layout." });
    if (context.frameAdapter) context.frameAdapter.applyLayout(target.id, layout);
    context.reportProgress({ stage: "APPLYING_AUTO_LAYOUT", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying frame auto layout." });
    context.reportProgress({ stage: "APPLYING_SIZING", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying frame sizing." });
    if (context.abortSignal.aborted) throw new RendererError("RENDER_CANCELLED", "Frame rendering was cancelled.", node.id);
    context.reportProgress({ stage: "APPLYING_VISUALS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying frame visual mapping." });
    if (context.frameAdapter) {
      context.frameAdapter.applyVisual(target.id, visual);
      context.frameAdapter.applyClipping(target.id, visual.clipsContent);
    } else target.clipsContent = visual.clipsContent;
    if (node.name === "Screenshot Reference") {
      target.locked = true;
      target.setPluginData("aio:layerGroup", "screenshot-reference");
    } else if (node.name === "Editable Layers") {
      target.setPluginData("aio:layerGroup", "editable-layers");
    }
    target.opacity = visual.opacity;
    target.visible = visual.visible;
    target.name = mapFrameName(node);
    createSideBorderAccents(target, node, context);
    const inlineBackground = node.visual.backgrounds.find((layer) => layer.type === "IMAGE" && layer.inlineDataUrl);
    if (inlineBackground?.inlineDataUrl && context.imageAdapter) {
      try {
        context.reportProgress({ stage: "APPLYING_IMAGE_PAINTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying inline background image paint." });
        const image = context.imageAdapter.createImage(decodeDataUrl(inlineBackground.inlineDataUrl));
        context.imageAdapter.applyBackgroundImagePaint(target.id, image.hash, "FILL");
      } catch {
        if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new Error("ASSET_IMAGE_PAINT_FAILED");
      }
    }
    const background = node.visual.backgrounds.find((layer) => layer.type === "IMAGE" && layer.assetBindingId);
    const assetBindings = Array.isArray(context.document.assetBindings) ? context.document.assetBindings : [];
    const binding = background?.assetBindingId ? assetBindings.find((item) => item.bindingId === background.assetBindingId) : undefined;
    const asset = binding ? context.assets?.assetsById.get(binding.assetId) : undefined;
    const imageHash = asset && context.imageAdapter ? context.assets?.imageHashesBySha256.get(asset.sha256) : undefined;
    if (imageHash && context.imageAdapter) {
      try { if (context.abortSignal.aborted) throw new RendererError("RENDER_CANCELLED", "Frame rendering was cancelled.", node.id); context.reportProgress({ stage: "APPLYING_IMAGE_PAINTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying background image paint." }); context.imageAdapter.applyBackgroundImagePaint(target.id, imageHash, "FILL"); }
      catch (error) { if (error instanceof RendererError) throw error; if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new Error("ASSET_IMAGE_PAINT_FAILED"); }
    }
    context.reportProgress({ stage: "RECONCILING_GEOMETRY", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Reconciling frame geometry." });
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: true, placeholder: false, registered: true };
  }
};

function createSideBorderAccents(target: RendererNode, node: DesignIrFrameNode, context: RenderContext): void {
  const base = dominantBorderStroke(node);
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const accent = sideBorderAccent(node, side, base);
    if (!accent) continue;
    createSideBorderAccent(target, node, context, side, accent);
  }
}

function createSideBorderAccent(target: RendererNode, node: DesignIrFrameNode, context: RenderContext, side: "top" | "right" | "bottom" | "left", accent: { width: number; color: DesignIrColor }): void {
  const rectangle = context.adapter.createRectangle();
  context.session.createdNodeIds.push(rectangle.id);
  rectangle.name = `border-${side} accent`;
  rectangle.visible = target.visible;
  rectangle.opacity = target.opacity;
  rectangle.fills = [{ type: "SOLID", color: { r: accent.color.r, g: accent.color.g, b: accent.color.b }, opacity: Math.max(0, Math.min(1, accent.color.a)) }];
  rectangle.strokes = [];
  rectangle.strokeWeight = 0;
  applySideRadius(rectangle, node, side);
  const width = side === "left" || side === "right" ? accent.width : Math.max(1, target.width);
  const height = side === "top" || side === "bottom" ? accent.width : Math.max(1, target.height);
  context.adapter.resizeNode(rectangle.id, width, height);
  rectangle.setPluginData("aio:generatedRole", `border-${side}-accent`);
  rectangle.setPluginData("aio:sourceFrameIrNodeId", node.id);
  if (node.sourceNodeId) rectangle.setPluginData("aio:sourceNodeId", node.sourceNodeId);
  target.appendChild(rectangle);
  if (target.layoutMode && target.layoutMode !== "NONE") rectangle.layoutPositioning = "ABSOLUTE";
  rectangle.x = side === "right" ? Math.max(0, target.width - accent.width) : 0;
  rectangle.y = side === "bottom" ? Math.max(0, target.height - accent.width) : 0;
}

function sideBorderAccent(node: DesignIrFrameNode, side: "top" | "right" | "bottom" | "left", base: { width: number; color: DesignIrColor } | undefined): { width: number; color: DesignIrColor } | undefined {
  const width = node.visual.border.width[side];
  const sideColor = node.visual.border.color[side];
  if (!sideColor || !Number.isFinite(width) || width <= 0 || node.geometry.width <= 0 || node.geometry.height <= 0) return undefined;
  if (base && width === base.width && colorDistance(sideColor, base.color) <= 0.01) return undefined;
  return { width: Math.min(Math.max(1, width), side === "top" || side === "bottom" ? node.geometry.height : node.geometry.width), color: sideColor };
}

function colorDistance(a: DesignIrColor, b: DesignIrColor): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b), Math.abs(a.a - b.a));
}

function dominantBorderStroke(node: DesignIrFrameNode): { width: number; color: DesignIrColor; sideCount: number } | undefined {
  const groups = new Map<string, { width: number; color: DesignIrColor; sideCount: number }>();
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const width = node.visual.border.width[side];
    const sideColor = node.visual.border.color[side];
    if (!sideColor || width <= 0) continue;
    const key = `${width}:${sideColor.r.toFixed(4)}:${sideColor.g.toFixed(4)}:${sideColor.b.toFixed(4)}:${sideColor.a.toFixed(4)}`;
    const group = groups.get(key) ?? { width, color: sideColor, sideCount: 0 };
    group.sideCount += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.sideCount - a.sideCount || b.width - a.width).find((group) => group.sideCount >= 3);
}

function applySideRadius(rectangle: RendererNode, node: DesignIrFrameNode, side: "top" | "right" | "bottom" | "left"): void {
  rectangle.topLeftRadius = side === "top" || side === "left" ? node.visual.radius.topLeft : 0;
  rectangle.topRightRadius = side === "top" || side === "right" ? node.visual.radius.topRight : 0;
  rectangle.bottomRightRadius = side === "bottom" || side === "right" ? node.visual.radius.bottomRight : 0;
  rectangle.bottomLeftRadius = side === "bottom" || side === "left" ? node.visual.radius.bottomLeft : 0;
}
