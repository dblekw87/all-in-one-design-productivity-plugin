import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { ResolvedAssetVersion } from "./version.js";

export type ResolvedAssetStatus = "RESOLVED" | "SKIPPED_UNSUPPORTED_REFERENCE" | "BLOCKED_SECURITY_POLICY" | "FETCH_TIMEOUT" | "FETCH_FAILED" | "HTTP_STATUS_REJECTED" | "REDIRECT_LIMIT_REACHED" | "CONTENT_LENGTH_EXCEEDED" | "STREAM_SIZE_EXCEEDED" | "TOTAL_BUDGET_EXCEEDED" | "MEDIA_TYPE_UNSUPPORTED" | "SIGNATURE_INVALID" | "MIME_MISMATCH" | "IMAGE_DIMENSION_LIMIT_EXCEEDED" | "SVG_INVALID" | "SVG_SANITIZATION_FAILED";
export type ResolvedMediaType = "IMAGE_PNG" | "IMAGE_JPEG" | "IMAGE_WEBP" | "IMAGE_GIF" | "IMAGE_AVIF" | "IMAGE_SVG" | "UNKNOWN";
export interface ResolvedAsset {
  assetId: string;
  status: ResolvedAssetStatus;
  mediaType: ResolvedMediaType;
  binary?: { byteLength: number; sha256: string; storageKey?: string | undefined };
  metadata?: { width?: number | undefined; height?: number | undefined; aspectRatio?: number | undefined; animatedCandidate?: boolean | undefined };
  source: { sanitizedUrl: string; finalSanitizedUrl?: string | undefined; redirectCount: number };
  inspection: { declaredContentType?: string | undefined; detectedMediaType?: string | undefined; signatureMatched: boolean; contentLengthHeader?: number | undefined };
  warnings: string[];
}
export type ResolvedAssetWarningCode = "ASSET_FETCH_FAILED" | "ASSET_FETCH_TIMEOUT" | "ASSET_REDIRECT_BLOCKED" | "ASSET_TOO_LARGE" | "TOTAL_ASSET_BUDGET_REACHED" | "CONTENT_TYPE_MISSING" | "CONTENT_TYPE_MISMATCH" | "FILE_SIGNATURE_INVALID" | "IMAGE_DIMENSION_UNKNOWN" | "IMAGE_DIMENSION_LIMIT_EXCEEDED" | "SVG_CONTENT_REMOVED" | "SVG_SANITIZATION_FAILED" | "DUPLICATE_BINARY_DETECTED";
export interface ResolvedAssetWarning { code: ResolvedAssetWarningCode; count: number; sampleAssetIds: string[]; message: string; }
export interface ResolvedAssetMetrics { totalReferenceCount: number; attemptedCount: number; resolvedCount: number; blockedCount: number; failedCount: number; skippedCount: number; totalDownloadedBytes: number; uniqueBinaryCount: number; duplicateBinaryCount: number; pngCount: number; jpegCount: number; webpCount: number; gifCount: number; avifCount: number; svgCount: number; sanitizedSvgCount: number; rejectedSvgCount: number; resolutionTimeMs: number; }
export interface ResolvedAssetDocument { resolutionVersion: ResolvedAssetVersion; source: { assetReferenceVersion: "1.0"; requestedUrl: string; finalUrl: string; resolvedAt: string }; assets: ResolvedAsset[]; metrics: ResolvedAssetMetrics; warnings: ResolvedAssetWarning[]; }
export interface ResolvedAssetOptions { maxBytes?: number; maxTotalBytes?: number; maxConcurrency?: number; maxRedirects?: number; timeoutMs?: number; maxImageWidth?: number; maxImageHeight?: number; maxImagePixels?: number; signal?: AbortSignal; securityValidator: (url: string) => Promise<{ safe: true } | { safe: false }>; fetcher?: typeof fetch; }
export type ResolvedAssetInput = { references: AssetReferenceDocument; options: ResolvedAssetOptions };
