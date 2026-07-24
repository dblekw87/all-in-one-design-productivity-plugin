import { describe, expect, it } from "vitest";
import { resolveAssets } from "../src/assets/resolution/resolve-assets.js";
import type { AssetReferenceDocument } from "@aio/asset-reference";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1]);
const references: AssetReferenceDocument = {
  referenceVersion: "1.0",
  source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com", finalUrl: "https://example.com", extractedAt: new Date().toISOString() },
  assets: [
    { assetId: "asset_000001", sourceType: "IMAGE_ELEMENT", mediaTypeHint: "PNG", reference: { original: "https://assets.example/image.png", resolved: "https://assets.example/image.png", sanitized: "https://assets.example/image.png", scheme: "HTTPS" }, status: "SUPPORTED_REFERENCE", flags: { inline: false, dataUrl: false, svg: false, animatedCandidate: false, hasQuery: false, crossOriginCandidate: true }, deduplicationKey: "IMAGE_ELEMENT:https://assets.example/image.png" },
    { assetId: "asset_000002", sourceType: "IMAGE_ELEMENT", mediaTypeHint: "PNG", reference: { original: "https://assets.example/bad.png", resolved: "https://assets.example/bad.png", sanitized: "https://assets.example/bad.png", scheme: "HTTPS" }, status: "SUPPORTED_REFERENCE", flags: { inline: false, dataUrl: false, svg: false, animatedCandidate: false, hasQuery: false, crossOriginCandidate: true }, deduplicationKey: "IMAGE_ELEMENT:https://assets.example/bad.png" }
  ], usages: [], metrics: { assetCount: 2, usageCount: 0, imageElementAssetCount: 2, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 2, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: []
};

describe("asset resolution", () => {
  it("validates signature, dimensions, hash, and partial failure", async () => {
    const result = await resolveAssets(references, {
      securityValidator: async () => ({ safe: true }),
      fetcher: async (input) => new Response(input.toString().endsWith("bad.png") ? "not an image" : png, { status: 200, headers: { "content-type": "image/png", "content-length": String(input.toString().endsWith("bad.png") ? 12 : png.byteLength) } })
    });
    expect(result.assets[0]).toMatchObject({ status: "RESOLVED", mediaType: "IMAGE_PNG", metadata: { width: 1, height: 1 } });
    expect(result.assets[0]?.binary?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.assets[1]?.status).toBe("SIGNATURE_INVALID");
    expect(result.metrics.resolvedCount).toBe(1);
  });
});
