import type { AnalyzeWarning, AnalyzeWebsiteResponse, SerializableError } from "@aio/shared-contracts";
import type { BrowserRuntime } from "../browser/browser-runtime.js";
import { serializeBrowserError } from "../browser/browser-errors.js";
import type { WebsiteAnalyzeService } from "./analyze-service.js";
import type { DomExtractionOptions } from "../browser/dom/dom-extraction-options.js";
import { normalizePage } from "../normalization/normalize-page.js";
import { buildLayoutEvidence } from "../layout/evidence/build-layout-evidence.js";
import { inferPageLayout } from "../layout/inference/infer-page-layout.js";
import { inferPageSizing } from "../sizing/infer-page-sizing.js";
import { extractAssetReferences } from "../assets/reference/extract-asset-references.js";
import type { AssetSecurityValidator } from "@aio/asset-reference";
import { resolveAssetsWithRuntime } from "../assets/resolution/resolve-assets.js";
import type { ResolvedAssetDocument } from "@aio/resolved-assets";
import { buildDesignIr } from "../design-ir/build-design-ir.js";
import { createAssetTransferSession } from "../import-session/create-import-session.js";
import type { ImportSessionLimits } from "../import-session/import-session-limits.js";
import type { ImportSessionStore } from "../import-session/import-session-store.js";

export class BrowserAnalyzeService implements WebsiteAnalyzeService {
  constructor(
    private readonly browserRuntime: BrowserRuntime,
    private readonly navigationTimeoutMs: number,
    private readonly extractionLimits: Pick<DomExtractionOptions, "maxDepth" | "maxNodes" | "maxTextNodeLength"> & {
      maxStyleEntries: number;
      maxStyleWarnings: number;
      maxGeometryEntries: number;
      maxAssetReferences: number;
      maxAssetUsages: number;
      maxAssetWarnings: number;
      assetSecurityValidator?: AssetSecurityValidator;
      maxAssetBytes: number;
      maxTotalAssetBytes: number;
      maxAssetConcurrency: number;
      maxAssetRedirects: number;
      assetFetchTimeoutMs: number;
      maxImageWidth: number;
      maxImageHeight: number;
      maxImagePixels: number;
      importSessionStore?: ImportSessionStore;
      importSessionLimits?: ImportSessionLimits;
    } = {
      maxDepth: 100,
      maxNodes: 5_000,
      maxTextNodeLength: 10_000,
      maxStyleEntries: 5_000,
      maxStyleWarnings: 100,
      maxGeometryEntries: 5_000,
      maxAssetReferences: 1_000,
      maxAssetUsages: 5_000,
      maxAssetWarnings: 100,
      maxAssetBytes: 5_242_880,
      maxTotalAssetBytes: 20_971_520,
      maxAssetConcurrency: 4,
      maxAssetRedirects: 5,
      assetFetchTimeoutMs: 10_000,
      maxImageWidth: 16_384,
      maxImageHeight: 16_384,
      maxImagePixels: 100_000_000
    }
  ) {}

  async analyze(command: Parameters<WebsiteAnalyzeService["analyze"]>[0]): Promise<AnalyzeWebsiteResponse> {
    let navigation;
    try {
      const options = command.signal ? { signal: command.signal } : undefined;
      navigation = await this.browserRuntime.navigate(
        {
          url: command.target.normalizedUrl,
          viewport: command.request.viewport,
          timeoutMs: this.navigationTimeoutMs,
          extraction: {
            ...command.request.options,
            maxDepth: this.extractionLimits.maxDepth,
            maxNodes: this.extractionLimits.maxNodes,
            maxTextNodeLength: this.extractionLimits.maxTextNodeLength
          },
          styleExtraction: {
            maxDepth: this.extractionLimits.maxDepth,
            maxEntries: this.extractionLimits.maxStyleEntries,
            maxWarnings: this.extractionLimits.maxStyleWarnings,
            includePseudoElements: command.request.options.includePseudoElements
          },
          geometryExtraction: {
            maxDepth: this.extractionLimits.maxDepth,
            maxEntries: this.extractionLimits.maxGeometryEntries
          }
        },
        options
      );
    } catch (error) {
      const serialized = serializeBrowserError(error);
      console.info(`[parser] ANALYZE_BROWSER_FAILED ${serialized.code}`);
      return browserFailureResponse(command, serialized);
    }

    const processingTimeMs = Math.max(0, command.nowMs() - command.startedAtMs);
    let normalizedModel;
    let layoutEvidence;
    let layoutInference;
    let sizingInference;
    let assetReferences;
    let resolvedAssets: ResolvedAssetDocument;
    let runtimeAssets;
    let document;
    try {
      normalizedModel = normalizePage(navigation.snapshot, navigation.styleSnapshot, navigation.geometry);
      layoutEvidence = buildLayoutEvidence(normalizedModel);
      layoutInference = inferPageLayout(normalizedModel, layoutEvidence);
      sizingInference = inferPageSizing(normalizedModel, layoutEvidence, layoutInference);
      assetReferences = await extractAssetReferences(normalizedModel, {
        maxReferences: this.extractionLimits.maxAssetReferences,
        maxUsages: this.extractionLimits.maxAssetUsages,
        maxWarnings: this.extractionLimits.maxAssetWarnings,
        ...(this.extractionLimits.assetSecurityValidator ? { securityValidator: this.extractionLimits.assetSecurityValidator } : {})
      });
      const resolved = await resolveAssetsWithRuntime(assetReferences, {
        maxBytes: this.extractionLimits.maxAssetBytes,
        maxTotalBytes: this.extractionLimits.maxTotalAssetBytes,
        maxConcurrency: this.extractionLimits.maxAssetConcurrency,
        maxRedirects: this.extractionLimits.maxAssetRedirects,
        timeoutMs: this.extractionLimits.assetFetchTimeoutMs,
        maxImageWidth: this.extractionLimits.maxImageWidth,
        maxImageHeight: this.extractionLimits.maxImageHeight,
        maxImagePixels: this.extractionLimits.maxImagePixels,
        ...(command.signal ? { signal: command.signal } : {}),
        securityValidator: this.extractionLimits.assetSecurityValidator ?? (async (url) => ({ safe: url.startsWith("https:") })),
        fetcher: fetch
      });
      resolvedAssets = resolved.document;
      runtimeAssets = resolved.runtimeAssets;
      document = buildDesignIr({ model: normalizedModel, layout: layoutInference, sizing: sizingInference, assetReferences, resolvedAssets });
    } catch (error) {
      console.info(`[parser] ANALYZE_DESIGN_IR_FAILED ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
      return browserFailureResponse(command, {
        code: "DESIGN_IR_BUILD_FAILED",
        message: error instanceof Error ? error.message : "The Design IR could not be built.",
        retryable: false
      });
    }

    let assetTransfer;
    let assetTransferWarning: AnalyzeWarning | undefined;
    if (this.extractionLimits.importSessionStore && this.extractionLimits.importSessionLimits) {
      try {
        assetTransfer = createAssetTransferSession(this.extractionLimits.importSessionStore, document, runtimeAssets, this.extractionLimits.importSessionLimits);
      } catch (error) {
        assetTransferWarning = {
          code: error instanceof Error && "code" in error ? String(error.code) : "IMPORT_SESSION_CREATE_FAILED",
          message: "Asset transfer session could not be created.",
          severity: "WARNING"
        };
      }
    }

    const warnings: AnalyzeWarning[] = [
      ...navigation.snapshot.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        severity: warning.severity
      })),
      ...navigation.styleSnapshot.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        severity: warning.severity
      })),
      ...(assetTransferWarning ? [assetTransferWarning] : [])
    ];

    return {
      contractVersion: "1.0",
      requestId: command.requestId,
      status: assetTransfer ? "TRANSFER_SESSION_READY" : "DESIGN_IR_BUILT",
      target: {
        normalizedUrl: command.target.normalizedUrl
      },
      viewport: command.request.viewport,
      navigation: {
        requestedUrl: navigation.requestedUrl,
        finalUrl: navigation.finalUrl,
        statusCode: navigation.statusCode,
        title: navigation.title,
        contentType: navigation.contentType
      },
      security: {
        totalRequests: navigation.security.totalRequests,
        allowedRequests: navigation.security.allowedRequests,
        blockedRequests: navigation.security.blockedRequests,
        redirectCount: navigation.security.redirectCount,
        blockedByCode: navigation.security.blockedByCode,
        warnings: navigation.security.warnings
      },
      snapshot: navigation.snapshot,
      styleSnapshot: navigation.styleSnapshot,
      geometry: navigation.geometry,
      normalizedModel,
      layoutEvidence,
      layoutInference,
      sizingInference,
      assetReferences,
      resolvedAssets,
      ...(assetTransfer ? { assetTransfer } : {}),
      document,
      assets: [],
      warnings,
      metrics: {
        processingTimeMs,
        domNodeCount: navigation.snapshot.metrics.totalNodeCount,
        designNodeCount: document.metrics.totalNodeCount,
        assetCount: 0,
        geometryEntryCount: navigation.geometry.metrics.entryCount
      }
    };
  }
}

function browserFailureResponse(
  command: Parameters<WebsiteAnalyzeService["analyze"]>[0],
  error: SerializableError
): AnalyzeWebsiteResponse {
  const processingTimeMs = Math.max(0, command.nowMs() - command.startedAtMs);

  return {
    contractVersion: "1.0",
    requestId: command.requestId,
  status: "NOT_IMPLEMENTED",
    target: {
      normalizedUrl: command.target.normalizedUrl
    },
    viewport: command.request.viewport,
    assets: [],
    warnings: [
      {
        code: error.code,
        message: error.message,
        severity: "ERROR"
      }
    ],
    metrics: {
      processingTimeMs,
      domNodeCount: 0,
      designNodeCount: 0,
      assetCount: 0
    }
  };
}
