import type { DesignIrFrameNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const frameNodeFactory: DesignIrNodeFactory<DesignIrFrameNode> = {
  nodeType: "FRAME",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.clipsContent = node.clipping.clipsContent;
    const background = node.visual.backgrounds.find((layer) => layer.type === "IMAGE" && layer.assetBindingId);
    const binding = background?.assetBindingId ? context.document.assetBindings.find((item) => item.bindingId === background.assetBindingId) : undefined;
    const asset = binding ? context.assets?.assetsById.get(binding.assetId) : undefined;
    const imageHash = asset && context.imageAdapter ? context.assets?.imageHashesBySha256.get(asset.sha256) : undefined;
    if (imageHash && context.imageAdapter) {
      try { context.reportProgress({ stage: "APPLYING_IMAGE_PAINTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying background image paint." }); context.imageAdapter.applyBackgroundImagePaint(target.id, imageHash, "FILL"); }
      catch { if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new Error("ASSET_IMAGE_PAINT_FAILED"); }
    }
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: true, placeholder: false };
  }
};
