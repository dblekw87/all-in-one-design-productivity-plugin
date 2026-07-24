export const FIGMA_ASSET_POLICY = Object.freeze({
  maxAssetBytes: 5 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxAssetCount: 1000,
  maxConcurrency: 4,
  timeoutMs: 10_000,
});
