import type { DesignIrNode } from "@aio/design-ir";
import type { RenderContext } from "../runtime/render-context";
import type { RendererNode } from "../runtime/node-types";

export function applyNodeBasics(target: RendererNode, node: DesignIrNode, context: RenderContext, root = false): void {
  target.name = node.name;
  target.x = root ? placementX(context, node.geometry.width) : node.geometry.x;
  target.y = root ? placementY(context, node.geometry.height) : node.geometry.y;
  target.width = node.geometry.width;
  target.height = node.geometry.height;
  target.opacity = node.visibility.visible ? node.confidence.layout >= 0 ? 1 : 0 : 0;
  target.visible = node.renderPolicy !== "SKIP" && node.visibility.visible;
  target.setPluginData("aio:irNodeId", node.id);
  if (node.sourceNodeId) target.setPluginData("aio:sourceNodeId", node.sourceNodeId);
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
