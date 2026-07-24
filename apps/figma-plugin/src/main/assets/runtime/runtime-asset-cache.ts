import type { AssetTransferEntry } from "@aio/shared-contracts";
import type { FigmaAssetClient, DownloadedAsset } from "../contracts/asset-client";

export function createRuntimeAssetCache(client: FigmaAssetClient, maxTotalBytes: number) {
  const pending = new Map<string, Promise<DownloadedAsset>>();
  const resolved = new Map<string, DownloadedAsset>();
  let totalBytes = 0;
  return {
    async get(asset: AssetTransferEntry, sessionId: string, accessToken: string, signal: AbortSignal): Promise<DownloadedAsset> {
      const existing = resolved.get(asset.assetId);
      if (existing) return existing;
      const inFlight = pending.get(asset.assetId);
      if (inFlight) return inFlight;
      if (totalBytes + asset.byteLength > maxTotalBytes) throw new Error("ASSET_LIMIT_EXCEEDED");
      const promise = client.fetchAsset({ sessionId, accessToken, asset, signal }).then((value) => { totalBytes += value.byteLength; resolved.set(value.assetId, value); pending.delete(asset.assetId); return value; }).catch((error) => { pending.delete(asset.assetId); throw error; });
      pending.set(asset.assetId, promise);
      return promise;
    },
    clear(): void { pending.clear(); resolved.clear(); totalBytes = 0; },
    get totalBytes(): number { return totalBytes; },
  };
}
