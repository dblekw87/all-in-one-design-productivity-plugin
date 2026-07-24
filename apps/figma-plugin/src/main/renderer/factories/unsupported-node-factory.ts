import type { DesignIrUnsupportedNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const unsupportedNodeFactory: DesignIrNodeFactory<DesignIrUnsupportedNode> = {
  nodeType: "UNSUPPORTED",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = `UNSUPPORTED: ${node.unsupportedReason}`;
    target.setPluginData("aio:placeholderType", "UNSUPPORTED");
    target.setPluginData("aio:unsupportedReason", node.unsupportedReason);
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: Boolean(node.children?.length), placeholder: true };
  }
};
