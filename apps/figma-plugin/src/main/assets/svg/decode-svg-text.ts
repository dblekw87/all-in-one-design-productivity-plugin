import { SvgAssetError } from "./svg-errors.js";

export function decodeSvgText(bytes: Uint8Array, assetId: string, maxBytes: number): string {
  if (bytes.byteLength > maxBytes) throw new SvgAssetError("SVG_SIZE_LIMIT_EXCEEDED", "SVG exceeds the Plugin byte limit.", assetId);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
    if (text.includes("\u0000") || text.trim().length === 0) throw new Error("empty or invalid text");
    return text;
  } catch {
    throw new SvgAssetError("SVG_UTF8_DECODE_FAILED", "SVG UTF-8 decoding failed.", assetId);
  }
}
