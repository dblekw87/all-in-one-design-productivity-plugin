import type { DesignIrImageNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";
import { mapImageFit } from "../mapping/map-image-fit";
import { decodeDataUrl } from "../assets/decode-data-url";

export const imagePlaceholderFactory: DesignIrNodeFactory<DesignIrImageNode> = {
  nodeType: "IMAGE",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = "IMAGE";
    if (node.inlineDataUrl && context.imageAdapter) {
      try {
        const image = context.imageAdapter.createImage(decodeDataUrl(node.inlineDataUrl));
        context.reportProgress({ stage: "APPLYING_IMAGE_PAINTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying inline image paint." });
        context.imageAdapter.applyImagePaint(target.id, image.hash, mapImageFit(node));
        target.setPluginData("aio:inlineImage", "true");
        return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: false };
      } catch {
        if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new Error("INLINE_IMAGE_PAINT_FAILED");
      }
    }
    if (node.assetBindingId) target.setPluginData("aio:assetBindingId", node.assetBindingId);
    const assetBindings = Array.isArray(context.document.assetBindings) ? context.document.assetBindings : [];
    const binding = node.assetBindingId ? assetBindings.find((item) => item.bindingId === node.assetBindingId) : undefined;
    const asset = binding ? context.assets?.assetsById.get(binding.assetId) : undefined;
    const imageHash = asset && context.imageAdapter ? context.assets?.imageHashesBySha256.get(asset.sha256) : undefined;
    if (imageHash && context.imageAdapter) {
      try { context.reportProgress({ stage: "APPLYING_IMAGE_PAINTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying image paint." }); context.imageAdapter.applyImagePaint(target.id, imageHash, mapImageFit(node)); return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: false }; }
      catch { if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new Error("ASSET_IMAGE_PAINT_FAILED"); }
    }
    target.setPluginData("aio:placeholderType", "IMAGE");
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: true };
  }
};
