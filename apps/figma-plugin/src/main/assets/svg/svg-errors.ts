export type SvgAssetErrorCode = "SVG_TRANSFER_ENTRY_INVALID" | "SVG_UTF8_DECODE_FAILED" | "SVG_PREFLIGHT_REJECTED" | "SVG_SIZE_LIMIT_EXCEEDED";

export class SvgAssetError extends Error {
  constructor(public readonly code: SvgAssetErrorCode, message: string, public readonly assetId?: string) {
    super(message);
    this.name = "SvgAssetError";
  }
}
