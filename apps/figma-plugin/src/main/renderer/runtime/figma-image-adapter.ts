export type ImageScaleMode = "FILL" | "FIT" | "CROP" | "TILE";

export interface FigmaImageAdapter {
  createImage(bytes: Uint8Array): { hash: string };
  applyImagePaint(nodeId: string, imageHash: string, scaleMode: ImageScaleMode): void;
  applyBackgroundImagePaint(nodeId: string, imageHash: string, scaleMode: ImageScaleMode): void;
}

export function createProductionFigmaImageAdapter(): FigmaImageAdapter {
  return {
    createImage(bytes) { return figma.createImage(bytes); },
    applyImagePaint(nodeId, imageHash, scaleMode) {
      const node = figma.getNodeById(nodeId);
      if (!node || !("fills" in node)) throw new Error("IMAGE node is unavailable.");
      (node as RectangleNode).fills = [{ type: "IMAGE", imageHash, scaleMode }];
    },
    applyBackgroundImagePaint(nodeId, imageHash, scaleMode) {
      const node = figma.getNodeById(nodeId);
      if (!node || !("fills" in node)) throw new Error("FRAME node is unavailable.");
      const fills = (node as RectangleNode).fills;
      (node as RectangleNode).fills = [{ type: "IMAGE", imageHash, scaleMode }, ...(Array.isArray(fills) ? fills.filter((paint): paint is SolidPaint => paint.type === "SOLID") : [])];
    },
  };
}
