import type { DesignIrNode } from "@aio/design-ir";
import type { RenderContext } from "../runtime/render-context";
import type { RendererNode } from "../runtime/node-types";
import { toParentRelativeBounds } from "../layout/contracts/geometry-mapping.js";
import { mapChildLayout } from "../layout/contracts/layout-mapping.js";

export function applyNodeBasics(target: RendererNode, node: DesignIrNode, context: RenderContext, root = false): void {
  target.name = node.name;
  const parentIrNode = node.parentId ? findNode(context.document.root, node.parentId) : undefined;
  const bounds = toParentRelativeBounds(node, parentIrNode);
  target.x = root ? placementX(context, bounds.width) : bounds.x;
  target.y = root ? placementY(context, bounds.height) : bounds.y;
  context.adapter.resizeNode(target.id, Math.max(1, bounds.width), Math.max(1, bounds.height));
  target.opacity = node.visibility.visible ? 1 : 0;
  target.visible = node.renderPolicy !== "SKIP" && node.visibility.visible;
  target.setPluginData("aio:irNodeId", node.id);
  if (node.sourceNodeId) target.setPluginData("aio:sourceNodeId", node.sourceNodeId);
  if (context.frameAdapter && !root) {
    const parent = parentIrNode?.nodeType === "FRAME" ? parentIrNode : undefined;
    const mapping = mapChildLayout(node, parent);
    context.frameAdapter.applyChildLayout(target.id, mapping);
    if (mapping.warningCodes.length > 0) for (const code of mapping.warningCodes) context.reportWarning({ code, message: "Child layout used a fallback.", irNodeId: node.id });
  }
}

function findNode(node: DesignIrNode, id: string): DesignIrNode | undefined {
  if (node.id === id) return node;
  if ("children" in node) for (const child of node.children ?? []) { const match = findNode(child, id); if (match) return match; }
  return undefined;
}

function placementX(context: RenderContext, width: number): number {
  if (context.options.placement === "PAGE_ORIGIN") return 0;
  if (context.options.placement === "SELECTION_OFFSET") return (context.adapter.getSelectionBounds()?.x ?? 0) + (context.adapter.getSelectionBounds()?.width ?? 0) + 40;
  return context.adapter.getViewportCenter().x - width / 2;
}

function placementY(context: RenderContext, height: number): number {
  if (context.options.placement === "PAGE_ORIGIN") return 0;
  if (context.options.placement === "SELECTION_OFFSET") return context.adapter.getSelectionBounds()?.y ?? 0;
  return context.adapter.getViewportCenter().y - height / 2;
}

export function placeholderName(node: DesignIrNode, label: string): string {
  return `${label}${node.nodeType === "TEXT" ? `: ${node.text.slice(0, 30).replace(/\s+/g, " ")}` : ""}`;
}
