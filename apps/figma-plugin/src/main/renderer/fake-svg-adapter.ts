import type { RendererNode } from "./runtime/node-types.js";
import type { FigmaSvgAdapter } from "./runtime/figma-svg-adapter.js";
import type { FakeFigmaRendererAdapter } from "./fake-adapter.js";

export class FakeFigmaSvgAdapter implements FigmaSvgAdapter {
  readonly created: string[] = [];
  constructor(private readonly renderer: FakeFigmaRendererAdapter) {}
  createNodeFromSvg(svg: string): RendererNode { if (!svg) throw new Error("empty SVG"); const node = this.renderer.createFrame(); node.name = "SVG Root"; this.created.push(node.id); return node; }
  applyGeometry(nodeId: string, geometry: { x: number; y: number; width: number; height: number }): void {
    const node = this.renderer.getNodeById(nodeId);
    if (!node) throw new Error("SVG node is unavailable.");
    node.x = geometry.x; node.y = geometry.y; node.width = geometry.width; node.height = geometry.height;
  }
}
