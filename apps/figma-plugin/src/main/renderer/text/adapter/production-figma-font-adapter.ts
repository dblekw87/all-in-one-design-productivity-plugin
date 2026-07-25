import type { RendererNode } from "../../runtime/node-types";
import type { FigmaTextAdapter, TextNodeStyle } from "./figma-font-adapter";

function node(value: unknown): RendererNode { return value as RendererNode; }

export function createProductionFigmaTextAdapter(): FigmaTextAdapter {
  return {
    async listAvailableFonts() {
      return (await figma.listAvailableFontsAsync()).map((font) => ({ family: font.fontName.family, style: font.fontName.style }));
    },
    async loadFont(font) {
      await figma.loadFontAsync(font);
    },
    createText() {
      return node(figma.createText());
    },
    applyTextStyle(nodeId, style) {
      const text = figma.getNodeById(nodeId) as TextNode | null;
      if (!text || text.type !== "TEXT") throw new Error("Figma text node was not found.");
      if (style.fontName) text.fontName = style.fontName;
      if (style.characters !== undefined) text.characters = style.characters;
      if (style.fontSize !== undefined) text.fontSize = style.fontSize;
      if (style.fills) text.fills = style.fills as Paint[];
      if (style.textAlignHorizontal) text.textAlignHorizontal = style.textAlignHorizontal;
      if (style.textAlignVertical) text.textAlignVertical = style.textAlignVertical;
      if (style.lineHeight) text.lineHeight = style.lineHeight;
      if (style.letterSpacing) text.letterSpacing = style.letterSpacing;
      if (style.textDecoration) text.textDecoration = style.textDecoration;
      if (style.textCase) text.textCase = style.textCase;
      if (style.textAutoResize) text.textAutoResize = style.textAutoResize;
    },
  };
}

export type ProductionTextNodeStyle = TextNodeStyle;
