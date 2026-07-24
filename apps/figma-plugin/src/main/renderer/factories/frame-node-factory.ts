import type { DesignIrFrameNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const frameNodeFactory: DesignIrNodeFactory<DesignIrFrameNode> = {
  nodeType: "FRAME",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.clipsContent = node.clipping.clipsContent;
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: true, placeholder: false };
  }
};
