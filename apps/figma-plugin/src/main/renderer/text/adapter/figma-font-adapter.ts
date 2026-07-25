import type { RendererNode } from "../../runtime/node-types";

export interface FigmaFontAdapter {
  listAvailableFonts(): Promise<Array<{ family: string; style: string }>>;
  loadFont(font: { family: string; style: string }): Promise<void>;
}

export interface TextNodeStyle {
  fontName: { family: string; style: string };
  characters: string;
  fontSize: number;
  fills: Array<{ type: "SOLID"; color: { r: number; g: number; b: number }; opacity?: number }>;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  lineHeight: { unit: "AUTO" } | { unit: "PIXELS"; value: number };
  letterSpacing: { unit: "PIXELS" | "PERCENT"; value: number };
  textDecoration: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  textCase: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  textAutoResize: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT";
}

export interface FigmaTextAdapter extends FigmaFontAdapter {
  createText(): RendererNode;
  applyTextStyle(nodeId: string, style: Partial<TextNodeStyle>): void;
}
