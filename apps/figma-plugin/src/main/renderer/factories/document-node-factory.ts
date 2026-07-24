import type { DesignIrDocumentNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";

export const documentNodeFactory: DesignIrNodeFactory<DesignIrDocumentNode> = {
  nodeType: "DOCUMENT",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context, true);
    target.name = node.name || "Imported Website";
    target.clipsContent = false;
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: true, placeholder: false };
  }
};
