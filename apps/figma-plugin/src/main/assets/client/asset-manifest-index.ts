import type { AssetTransferManifest } from "@aio/shared-contracts";
import { AssetClientError } from "../contracts/asset-errors.js";
import type { AssetManifestIndex } from "../contracts/asset-transfer-context.js";

export function createAssetManifestIndex(manifest: AssetTransferManifest, bindingToAssetIds: ReadonlyMap<string, string>): AssetManifestIndex {
  if (manifest.manifestVersion !== "1.0" || manifest.session.sessionId.length === 0 || manifest.assets.length > 1000) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset manifest is invalid.");
  if (new Date(manifest.session.expiresAt).getTime() <= Date.now() || manifest.metrics.assetCount !== manifest.assets.length) throw new AssetClientError("ASSET_SESSION_EXPIRED", "Asset transfer session has expired.");
  const assetsById = new Map<string, AssetTransferManifest["assets"][number]>();
  const assetsByBindingId = new Map<string, AssetTransferManifest["assets"][number]>();
  const manifestBindingIds = new Set<string>();
  for (const asset of manifest.assets) {
    if (assetsById.has(asset.assetId) || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset manifest contains invalid entries.", asset.assetId);
    if (!asset.downloadPath.startsWith("/v1/imports/") || asset.downloadPath.includes("..") || asset.downloadPath.includes("://")) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset download path is invalid.", asset.assetId);
    assetsById.set(asset.assetId, asset);
    for (const bindingId of asset.bindingIds) { if (manifestBindingIds.has(bindingId)) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset binding is duplicated.", asset.assetId); manifestBindingIds.add(bindingId); }
  }
  for (const [bindingId, assetId] of bindingToAssetIds) {
    const asset = assetsById.get(assetId);
    if (!asset) throw new AssetClientError("ASSET_MANIFEST_MISMATCH", "Design IR binding is missing from the asset manifest.", assetId);
    if (assetsByBindingId.has(bindingId)) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset binding is duplicated.", assetId);
    assetsByBindingId.set(bindingId, asset);
  }
  return { assetsById, assetsByBindingId };
}
