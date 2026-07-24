import type { NormalizedElementNode, NormalizedPageModel } from "@aio/page-model";
import type { AssetReferenceDocument } from "./contract.js";
import { assetReferenceSchema } from "./schema.js";

export function parseAssetReferenceDocument(value: unknown): AssetReferenceDocument { return assetReferenceSchema.parse(value) as AssetReferenceDocument; }
export function validateAssetReferenceSemantics(document: AssetReferenceDocument, model: NormalizedPageModel): void {
  const nodes = new Map<string, NormalizedElementNode>(); const visit = (node: NormalizedElementNode) => { nodes.set(node.id, node); for (const child of node.children) if (child.nodeType === "ELEMENT") visit(child); }; visit(model.root);
  const ids = new Set<string>(); const keys = new Set<string>(); for (const asset of document.assets) { if (ids.has(asset.assetId) || keys.has(asset.deduplicationKey)) throw new Error("ASSET_REFERENCE_DUPLICATE"); ids.add(asset.assetId); keys.add(asset.deduplicationKey); }
  const usages = new Set<string>(); for (const item of document.usages) { if (usages.has(item.usageId) || !ids.has(item.assetId) || !nodes.has(item.nodeId)) throw new Error("ASSET_REFERENCE_SEMANTIC_INVALID"); usages.add(item.usageId); }
  if (document.metrics.assetCount !== document.assets.length || document.metrics.usageCount !== document.usages.length) throw new Error("ASSET_REFERENCE_METRICS_INVALID");
}
