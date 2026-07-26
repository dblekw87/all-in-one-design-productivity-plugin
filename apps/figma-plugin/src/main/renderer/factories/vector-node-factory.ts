import type { DesignIrVectorNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory.js";
import { RendererError } from "../contracts/render-errors.js";
import { applyNodeBasics } from "./factory-helpers.js";

export const vectorNodeFactory: DesignIrNodeFactory<DesignIrVectorNode> = {
  nodeType: "VECTOR",
  async create(node, context) {
    const assetBindings = Array.isArray(context.document.assetBindings) ? context.document.assetBindings : [];
    const binding = node.assetBindingId ? assetBindings.find((item) => item.bindingId === node.assetBindingId) : undefined;
    const entry = binding ? context.assets?.assetEntriesById.get(binding.assetId) : undefined;
    const svgText = entry ? context.assets?.svgTextsBySha256.get(entry.sha256) : undefined;
    if (context.svgAdapter && svgText) {
      try {
        context.reportProgress({ stage: "CREATING_VECTOR_NODES", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Creating sanitized SVG node." });
        const target = context.svgAdapter.createNodeFromSvg(svgText);
        applyNodeBasics(target, node, context);
        context.reportProgress({ stage: "APPLYING_VECTOR_GEOMETRY", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying vector geometry." });
        context.svgAdapter.applyGeometry(target.id, { x: node.geometry.x, y: node.geometry.y, width: node.geometry.width, height: node.geometry.height });
        target.name = node.name || "VECTOR";
        target.setPluginData("aio:vectorStatus", "SANITIZED_SVG_AVAILABLE");
        if (node.assetBindingId) target.setPluginData("aio:assetBindingId", node.assetBindingId);
        return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: false };
      } catch {
        if (context.options.assetFailurePolicy === "FAIL_RENDER") throw new RendererError("RENDER_NODE_CREATE_FAILED", "Sanitized SVG could not be rendered.", node.id);
      }
    }
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = "VECTOR";
    target.setPluginData("aio:placeholderType", "VECTOR");
    if (node.assetBindingId) target.setPluginData("aio:assetBindingId", node.assetBindingId);
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: true };
  }
};
