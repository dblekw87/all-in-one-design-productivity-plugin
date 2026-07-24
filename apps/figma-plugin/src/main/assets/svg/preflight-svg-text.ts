import { SvgAssetError } from "./svg-errors.js";

const forbidden = /<\s*(script|foreignObject|iframe|object|embed|video|audio)\b|javascript\s*:|on[a-z]+\s*=|<!DOCTYPE|<!ENTITY|(?:href|xlink:href|src|url)\s*=\s*["']?https?:\/\/|data:text\/html/i;

export function preflightSvgText(svg: string, assetId: string, maxTextLength: number): void {
  if (svg.length > maxTextLength || !/<\s*svg\b/i.test(svg) || forbidden.test(svg)) throw new SvgAssetError("SVG_PREFLIGHT_REJECTED", "SVG failed Plugin safety preflight.", assetId);
}
