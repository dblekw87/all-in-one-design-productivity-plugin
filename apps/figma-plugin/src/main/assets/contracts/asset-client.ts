import type { AssetTransferEntry } from "@aio/shared-contracts";

export interface AssetTransferRuntimeContext {
  sessionId: string;
  accessToken: string;
  expiresAt: string;
  manifest: { manifestVersion: "1.0"; session: { sessionId: string; expiresAt: string }; assets: AssetTransferEntry[]; metrics: { assetCount: number; totalByteLength: number } };
}

export interface DownloadedAsset {
  assetId: string;
  mediaType: string;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
}

export interface FigmaAssetClient {
  fetchAsset(input: { sessionId: string; accessToken: string; asset: AssetTransferEntry; signal: AbortSignal }): Promise<DownloadedAsset>;
  deleteSession(input: { sessionId: string; accessToken: string; signal?: AbortSignal }): Promise<void>;
}

export interface AssetClientConfig {
  baseUrl: string;
  maxAssetBytes?: number;
  maxTotalBytes?: number;
  maxConcurrency?: number;
  timeoutMs?: number;
}
