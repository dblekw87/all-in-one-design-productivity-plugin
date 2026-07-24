export type AssetClientErrorCode =
  | "ASSET_TRANSFER_CONTEXT_INVALID"
  | "ASSET_MANIFEST_INVALID"
  | "ASSET_MANIFEST_MISMATCH"
  | "ASSET_SESSION_EXPIRED"
  | "ASSET_FETCH_FAILED"
  | "ASSET_FETCH_TIMEOUT"
  | "ASSET_HTTP_STATUS_INVALID"
  | "ASSET_CONTENT_TYPE_MISMATCH"
  | "ASSET_CONTENT_LENGTH_MISMATCH"
  | "ASSET_BYTE_LENGTH_MISMATCH"
  | "ASSET_SHA256_MISMATCH"
  | "ASSET_LIMIT_EXCEEDED"
  | "ASSET_CREATE_IMAGE_FAILED"
  | "ASSET_IMAGE_PAINT_FAILED"
  | "ASSET_SESSION_CLEANUP_FAILED";

export class AssetClientError extends Error {
  constructor(readonly code: AssetClientErrorCode, message: string, readonly assetId?: string) {
    super(message);
    this.name = "AssetClientError";
  }
}
