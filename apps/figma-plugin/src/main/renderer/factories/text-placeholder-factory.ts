import type { DesignIrTextNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics, placeholderName } from "./factory-helpers";

export const textPlaceholderFactory: DesignIrNodeFactory<DesignIrTextNode> = {
  nodeType: "TEXT",
  async create(node, context) {
    const target = context.adapter.createFrame();
    applyNodeBasics(target, node, context);
    target.name = placeholderName(node, "TEXT");
    target.setPluginData("aio:placeholderType", "TEXT");
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: true };
  }
};
