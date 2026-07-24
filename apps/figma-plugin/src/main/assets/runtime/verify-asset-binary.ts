import { AssetClientError } from "../contracts/asset-errors.js";

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new AssetClientError("ASSET_FETCH_FAILED", "Web Crypto is unavailable in the Plugin runtime.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyDownloadedAsset(bytes: Uint8Array, expectedBytes: number, expectedSha256: string, maxBytes: number, assetId: string): Promise<void> {
  if (bytes.byteLength > maxBytes) throw new AssetClientError("ASSET_LIMIT_EXCEEDED", "Asset exceeds the Plugin byte limit.", assetId);
  if (bytes.byteLength !== expectedBytes) throw new AssetClientError("ASSET_BYTE_LENGTH_MISMATCH", "Asset byte length does not match the manifest.", assetId);
  const actual = await sha256Hex(bytes);
  if (actual !== expectedSha256) throw new AssetClientError("ASSET_SHA256_MISMATCH", "Asset SHA-256 does not match the manifest.", assetId);
}
