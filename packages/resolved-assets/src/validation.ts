import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { ResolvedAssetDocument } from "./contract.js";
import { resolvedAssetSchema } from "./schema.js";
export function parseResolvedAssetDocument(value: unknown): ResolvedAssetDocument { return resolvedAssetSchema.parse(value) as ResolvedAssetDocument; }
export function validateResolvedAssetSemantics(document: ResolvedAssetDocument, references: AssetReferenceDocument): void {
  const ids = new Set(references.assets.map((asset) => asset.assetId)); const seen = new Set<string>();
  for (const asset of document.assets) { if (!ids.has(asset.assetId) || seen.has(asset.assetId)) throw new Error("RESOLVED_ASSET_SEMANTIC_INVALID"); seen.add(asset.assetId); if (asset.status === "RESOLVED" && !asset.binary) throw new Error("RESOLVED_ASSET_BINARY_MISSING"); if (asset.status !== "RESOLVED" && asset.binary) throw new Error("RESOLVED_ASSET_BINARY_UNEXPECTED"); }
  if (document.metrics.totalReferenceCount !== references.assets.length || document.metrics.attemptedCount !== document.assets.length) throw new Error("RESOLVED_ASSET_METRICS_INVALID");
}
