import type { DesignIrFrameNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";
import { mapLayoutMode } from "../layout/contracts/layout-mapping.js";
import { mapFrameVisual, mapFrameName } from "../visual/contracts/visual-mapping.js";
import { RendererError } from "../contracts/render-errors.js";

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
    target.opacity = visual.opacity;
    target.visible = visual.visible;
    target.name = mapFrameName(node);
    const background = node.visual.backgrounds.find((layer) => layer.type === "IMAGE" && layer.assetBindingId);
    const binding = background?.assetBindingId ? context.document.assetBindings.find((item) => item.bindingId === background.assetBindingId) : undefined;
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
