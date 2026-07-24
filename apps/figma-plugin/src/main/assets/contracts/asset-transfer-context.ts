import type { AssetTransferEntry } from "@aio/shared-contracts";
import type { DownloadedAsset } from "./asset-client.js";

export interface AssetManifestIndex {
  assetsById: ReadonlyMap<string, AssetTransferEntry>;
  assetsByBindingId: ReadonlyMap<string, AssetTransferEntry>;
}

export interface PreparedAssetRuntime {
  assetsById: ReadonlyMap<string, DownloadedAsset>;
  assetEntriesById: ReadonlyMap<string, AssetTransferEntry>;
  imageHashesBySha256: ReadonlyMap<string, string>;
  svgTextsBySha256: ReadonlyMap<string, string>;
  warnings: string[];
}
