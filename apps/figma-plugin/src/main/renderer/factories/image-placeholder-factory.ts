import type { DesignIrImageNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const imagePlaceholderFactory: DesignIrNodeFactory<DesignIrImageNode> = {
  nodeType: "IMAGE",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = "IMAGE";
    target.setPluginData("aio:placeholderType", "IMAGE");
    if (node.assetBindingId) target.setPluginData("aio:assetBindingId", node.assetBindingId);
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: true };
  }
};
