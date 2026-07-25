import type { DesignIrDocumentNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import { applyNodeBasics } from "./factory-helpers";
import { validateRootScale } from "../layout/contracts/geometry-mapping.js";
import { RendererError } from "../contracts/render-errors.js";

export const documentNodeFactory: DesignIrNodeFactory<DesignIrDocumentNode> = {
  nodeType: "DOCUMENT",
  async create(node, context) {
    if (context.abortSignal.aborted) throw new RendererError("RENDER_CANCELLED", "Frame rendering was cancelled.", node.id);
    const target = context.adapter.createFrame();
    context.registerCreatedNode(node.id, target.id);
    const scale = validateRootScale(node);
    for (const code of scale.warningCodes) context.reportWarning({ code, message: "Root geometry was normalized without rescaling children.", irNodeId: node.id });
    applyNodeBasics(target, { ...node, geometry: { ...node.geometry, width: scale.width, height: scale.height } }, context, true);
    context.adapter.resizeNode(target.id, scale.width, scale.height);
    target.name = node.name || "Imported Website";
    target.clipsContent = false;
    context.reportProgress({ stage: "VALIDATING_ROOT_SCALE", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Validated browser-to-Figma root scale." });
    return { irNodeId: node.id, figmaNodeId: target.id, childContainer: true, placeholder: false, registered: true };
  }
};
