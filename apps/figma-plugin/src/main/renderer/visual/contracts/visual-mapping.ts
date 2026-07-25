import type { DesignIrColor, DesignIrFrameNode } from "@aio/design-ir";

export interface RendererPaint { type: "SOLID" | "IMAGE"; color?: { r: number; g: number; b: number }; opacity?: number; imageHash?: string; scaleMode?: string; }
export interface RendererEffect { type: "DROP_SHADOW" | "INNER_SHADOW"; color: { r: number; g: number; b: number; a: number }; offset: { x: number; y: number }; radius: number; spread?: number; visible: boolean; blendMode?: string; }
export interface FrameVisualMapping {
  fills: RendererPaint[];
  strokes: RendererPaint[];
  strokeWeight: number;
  cornerRadii: [number, number, number, number];
  opacity: number;
  visible: boolean;
  clipsContent: boolean;
  effects: RendererEffect[];
  warningCodes: string[];
}

export function mapFrameVisual(node: DesignIrFrameNode): FrameVisualMapping {
  const warnings: string[] = [];
  const fills: RendererPaint[] = [];
  for (const layer of node.visual.backgrounds) {
    if (layer.type === "SOLID" && layer.color) fills.push({ type: "SOLID", color: color(layer.color), opacity: clamp(layer.color.a) });
    else if (layer.type === "GRADIENT_RAW" || layer.type === "UNSUPPORTED") warnings.push("BACKGROUND_MAPPING_FAILED");
  }
  const borderWidths = Object.values(node.visual.border.width);
  const borderColors = Object.values(node.visual.border.color);
  const sameWidth = borderWidths.every((value) => value === borderWidths[0]);
  const firstColor = borderColors.find((value): value is DesignIrColor => Boolean(value));
  const strokes = firstColor && borderWidths.some((value) => value > 0) ? [{ type: "SOLID" as const, color: color(firstColor), opacity: clamp(firstColor.a) }] : [];
  if (!sameWidth && borderWidths.some((value) => value > 0)) warnings.push("STROKE_MAPPING_FAILED");
  const strokeWeight = clampNumber(borderWidths[0] ?? 0, 0, 100);
  const radii = [node.visual.radius.topLeft, node.visual.radius.topRight, node.visual.radius.bottomRight, node.visual.radius.bottomLeft].map((value) => clampNumber(value, 0, 10_000)) as [number, number, number, number];
  if (Object.values(node.visual.radius).some((value) => !Number.isFinite(value) || value < 0)) warnings.push("CORNER_RADIUS_MAPPING_FAILED");
  const effects = node.visual.shadows.slice(0, 1).map((value) => parseShadow(value)).filter((value): value is RendererEffect => Boolean(value));
  if (node.visual.shadows.length > 1) warnings.push("SHADOW_MAPPING_FAILED");
  if (node.visual.shadows.length > 0 && effects.length === 0) warnings.push("SHADOW_MAPPING_FAILED");
  return { fills, strokes, strokeWeight, cornerRadii: radii, opacity: clamp(node.visual.opacity), visible: node.visibility.visible && node.renderPolicy !== "SKIP", clipsContent: node.clipping.clipsContent || node.visual.overflow !== "VISIBLE", effects, warningCodes: warnings };
}

export function mapFrameName(node: DesignIrFrameNode): string {
  const semantic = node.semantic;
  const tag = semantic?.tagName?.trim().toLowerCase();
  const label = semantic?.ariaLabel?.trim();
  if (label) return truncate(label);
  if (tag && semantic?.landmark) return truncate(`${tag} (${semantic.landmark})`);
  if (tag && node.name.toLowerCase() === tag) return tag;
  const safeName = node.name.replace(/\b(?:[a-z]+-)?[a-z0-9]{6,}\b/gi, "").replace(/\s+/g, " ").trim();
  return truncate(safeName || tag || "Frame");
}

function color(value: DesignIrColor) { return { r: clamp(value.r), g: clamp(value.g), b: clamp(value.b) }; }
function clamp(value: number): number { return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0; }
function clampNumber(value: number, min: number, max: number): number { return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min; }
function truncate(value: string): string { return value.slice(0, 80) || "Frame"; }

function parseShadow(raw: string): RendererEffect | undefined {
  const value = raw.trim();
  const numbers = value.match(/-?\d+(?:\.\d+)?px/g)?.map((item) => Number.parseFloat(item)) ?? [];
  if (numbers.length < 2) return undefined;
  const hex = value.match(/#([0-9a-f]{6})([0-9a-f]{2})?/i);
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  let red = 0, green = 0, blue = 0, alpha = 0.25;
  if (hex) { const digits = hex[1] ?? "000000"; const alphaHex = hex[2]; red = Number.parseInt(digits.slice(0, 2), 16) / 255; green = Number.parseInt(digits.slice(2, 4), 16) / 255; blue = Number.parseInt(digits.slice(4, 6), 16) / 255; if (alphaHex) alpha = Number.parseInt(alphaHex, 16) / 255; }
  else if (rgb) { const parts = (rgb[1] ?? "").split(",").map((item) => Number.parseFloat(item.trim())); red = (parts[0] ?? 0) / 255; green = (parts[1] ?? 0) / 255; blue = (parts[2] ?? 0) / 255; alpha = parts[3] ?? alpha; }
  return { type: value.toLowerCase().includes("inset") ? "INNER_SHADOW" : "DROP_SHADOW", color: { r: red, g: green, b: blue, a: alpha }, offset: { x: numbers[0] ?? 0, y: numbers[1] ?? 0 }, radius: Math.max(0, numbers[2] ?? 0), ...(numbers[3] !== undefined ? { spread: numbers[3] } : {}), visible: true };
}
