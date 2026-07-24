import type { DownloadedAsset, FigmaAssetClient } from "../contracts/asset-client.js";
import type { AssetTransferEntry } from "@aio/shared-contracts";
import { decodeSvgText } from "./decode-svg-text.js";
import { preflightSvgText } from "./preflight-svg-text.js";

export function createSvgRuntimeCache(client: FigmaAssetClient, maxBytes: number, maxTextLength: number) {
  const pending = new Map<string, Promise<string>>();
  const values = new Map<string, string>();
  return {
    get(entry: AssetTransferEntry, sessionId: string, accessToken: string, signal: AbortSignal): Promise<string> {
      const cached = values.get(entry.sha256);
      if (cached) return Promise.resolve(cached);
      const existing = pending.get(entry.sha256);
      if (existing) return existing;
      const task = client.fetchAsset({ sessionId, accessToken, asset: entry, signal }).then((asset: DownloadedAsset) => {
        const text = decodeSvgText(asset.bytes, asset.assetId, maxBytes);
        preflightSvgText(text, asset.assetId, maxTextLength);
        values.set(entry.sha256, text);
        return text;
      }).finally(() => pending.delete(entry.sha256));
      pending.set(entry.sha256, task);
      return task;
    },
    clear(): void { pending.clear(); values.clear(); }
  };
}
