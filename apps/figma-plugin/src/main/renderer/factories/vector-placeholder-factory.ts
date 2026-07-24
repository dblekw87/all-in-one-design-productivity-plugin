import type { DesignIrVectorNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const vectorPlaceholderFactory: DesignIrNodeFactory<DesignIrVectorNode> = {
  nodeType: "VECTOR",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = "VECTOR";
    target.setPluginData("aio:placeholderType", "VECTOR");
    if (node.assetBindingId) target.setPluginData("aio:assetBindingId", node.assetBindingId);
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: true };
  }
};
