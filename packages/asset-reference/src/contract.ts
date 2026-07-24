import type { NormalizedPageModel } from "@aio/page-model";
import type { AssetReferenceVersion } from "./version.js";

export type AssetSourceType = "IMAGE_ELEMENT" | "PICTURE_SOURCE" | "INLINE_SVG" | "EXTERNAL_SVG" | "BACKGROUND_IMAGE" | "PSEUDO_BACKGROUND_IMAGE" | "DATA_URL" | "OTHER";
export type AssetMediaTypeHint = "PNG" | "JPEG" | "WEBP" | "GIF" | "AVIF" | "SVG" | "UNKNOWN";
export type AssetScheme = "HTTPS" | "DATA" | "BLOB" | "OTHER";
export type AssetReferenceStatus = "SUPPORTED_REFERENCE" | "UNSUPPORTED_REFERENCE" | "BLOCKED_REFERENCE" | "INVALID_REFERENCE";
export type AssetUsageType = "ELEMENT_SOURCE" | "PICTURE_CANDIDATE" | "BACKGROUND_LAYER" | "PSEUDO_BEFORE_BACKGROUND" | "PSEUDO_AFTER_BACKGROUND" | "INLINE_SVG_CONTENT";
export type AssetReferenceWarningCode = "ASSET_URL_INVALID" | "ASSET_URL_BLOCKED" | "ASSET_SCHEME_UNSUPPORTED" | "DATA_URL_TOO_LARGE" | "DATA_URL_MEDIA_TYPE_UNSUPPORTED" | "BLOB_URL_UNSUPPORTED" | "INLINE_SVG_CONTENT_DEFERRED" | "EXTERNAL_SVG_USE_UNSUPPORTED" | "BACKGROUND_IMAGE_PARSE_PARTIAL" | "ASSET_MEDIA_TYPE_UNKNOWN" | "ASSET_REFERENCE_LIMIT_REACHED";

export interface AssetReference {
  assetId: string;
  sourceType: AssetSourceType;
  mediaTypeHint: AssetMediaTypeHint;
  reference: { original: string; resolved?: string | undefined; sanitized: string; scheme: AssetScheme };
  status: AssetReferenceStatus;
  flags: { inline: boolean; dataUrl: boolean; svg: boolean; animatedCandidate: boolean; hasQuery: boolean; crossOriginCandidate: boolean };
  deduplicationKey: string;
}
export interface AssetUsage {
  usageId: string;
  assetId: string;
  nodeId: string;
  usageType: AssetUsageType;
  property?: string | undefined;
  layerIndex?: number | undefined;
  attributes?: { alt?: string | undefined; objectFit?: string | undefined; objectPosition?: string | undefined } | undefined;
}
export interface AssetReferenceMetrics {
  assetCount: number; usageCount: number; imageElementAssetCount: number; inlineSvgAssetCount: number; externalSvgAssetCount: number;
  backgroundAssetCount: number; pseudoBackgroundAssetCount: number; dataUrlAssetCount: number; supportedAssetCount: number;
  blockedAssetCount: number; unsupportedAssetCount: number; invalidAssetCount: number; deduplicatedUsageCount: number; extractionTimeMs: number;
}
export interface AssetReferenceWarning { code: AssetReferenceWarningCode; count: number; sampleNodeIds: string[]; message: string; }
export interface AssetReferenceDocument {
  referenceVersion: AssetReferenceVersion;
  source: { domSnapshotVersion: "1.0"; styleSnapshotVersion: "1.0"; modelVersion: "1.0"; requestedUrl: string; finalUrl: string; extractedAt: string };
  assets: AssetReference[]; usages: AssetUsage[]; metrics: AssetReferenceMetrics; warnings: AssetReferenceWarning[];
}
export type AssetSecurityValidator = (url: string) => Promise<{ safe: true } | { safe: false }>;
export interface AssetReferenceOptions { maxReferences?: number; maxUsages?: number; maxWarnings?: number; securityValidator?: AssetSecurityValidator; }
export type AssetReferenceInput = { model: NormalizedPageModel; options?: AssetReferenceOptions };
