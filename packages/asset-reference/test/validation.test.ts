import { describe, expect, it } from "vitest";
import { parseAssetReferenceDocument } from "../src/index.js";

describe("asset reference contract", () => {
  it("parses an empty reference document", () => {
    expect(parseAssetReferenceDocument({ referenceVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com", finalUrl: "https://example.com", extractedAt: new Date().toISOString() }, assets: [], usages: [], metrics: { assetCount: 0, usageCount: 0, imageElementAssetCount: 0, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 0, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: [] }).referenceVersion).toBe("1.0");
  });
});
