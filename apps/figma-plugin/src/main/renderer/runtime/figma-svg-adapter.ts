import type { RendererNode } from "./node-types.js";

export interface FigmaSvgAdapter {
  createNodeFromSvg(svg: string): RendererNode;
  applyGeometry(nodeId: string, geometry: { x: number; y: number; width: number; height: number }): void;
}

export function createProductionFigmaSvgAdapter(): FigmaSvgAdapter {
  return {
    createNodeFromSvg(svg) { return figma.createNodeFromSvg(svg) as unknown as RendererNode; },
    applyGeometry(nodeId, geometry) {
      const node = figma.getNodeById(nodeId);
      if (!node || !("resizeWithoutConstraints" in node)) throw new Error("SVG node is unavailable.");
      const target = node as SceneNode & { resizeWithoutConstraints(width: number, height: number): void };
      target.resizeWithoutConstraints(geometry.width, geometry.height);
      target.x = geometry.x;
      target.y = geometry.y;
    }
  };
}
