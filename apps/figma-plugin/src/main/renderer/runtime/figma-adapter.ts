import type { FigmaRendererAdapter, RendererNode } from "./node-types";

type FigmaLikeNode = RendererNode & { remove(): void };

function node(value: unknown): FigmaLikeNode { return value as FigmaLikeNode; }

export function createFigmaRendererAdapter(): FigmaRendererAdapter {
  return {
    createFrame: () => node(figma.createFrame()),
    createRectangle: () => node(figma.createRectangle()),
    resizeNode: (id, width, height) => {
      const value = figma.getNodeById(id) as (BaseNode & { resizeWithoutConstraints?: (width: number, height: number) => void }) | null;
      if (!value || typeof value.resizeWithoutConstraints !== "function") throw new Error("Figma node does not support resizeWithoutConstraints");
      value.resizeWithoutConstraints(width, height);
    },
    getNodeById: (id) => node(figma.getNodeById(id)) as RendererNode | null,
    removeNode: (id) => { const value = figma.getNodeById(id); if (value) value.remove(); },
    setSelection: (nodes) => { figma.currentPage.selection = nodes as never[]; },
    scrollIntoView: (value) => { figma.viewport.scrollAndZoomIntoView([value] as never[]); },
    getViewportCenter: () => figma.viewport.center,
    getSelectionBounds: () => undefined
  };
}
