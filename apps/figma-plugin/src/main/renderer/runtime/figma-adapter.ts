import type { FigmaRendererAdapter, RendererNode } from "./node-types";

type FigmaLikeNode = RendererNode & { remove(): void };

function node(value: unknown): FigmaLikeNode { return value as FigmaLikeNode; }

export function createFigmaRendererAdapter(): FigmaRendererAdapter {
  return {
    createFrame: () => node(figma.createFrame()),
    createRectangle: () => node(figma.createRectangle()),
    getNodeById: (id) => node(figma.getNodeById(id)) as RendererNode | null,
    removeNode: (id) => { const value = figma.getNodeById(id); if (value) value.remove(); },
    setSelection: (nodes) => { figma.currentPage.selection = nodes as never[]; },
    scrollIntoView: (value) => { figma.viewport.scrollAndZoomIntoView([value] as never[]); },
    getViewportCenter: () => figma.viewport.center,
    getSelectionBounds: () => undefined
  };
}
