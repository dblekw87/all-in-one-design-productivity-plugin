import { CAPTURE_SNAPSHOT_VERSION, type CaptureMode, type CaptureSnapshot, type CaptureSnapshotWarning, type CaptureSource } from "@aio/shared-contracts";
import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { BrowserNavigationResult } from "../browser/browser-runtime.js";

export interface CaptureSnapshotBuilderInput {
  captureMode?: CaptureMode;
  captureSource?: CaptureSource;
  navigation: BrowserNavigationResult;
  assetReferences?: AssetReferenceDocument;
  durationMs: number;
  browser?: string;
  platform?: string;
}

export function buildCaptureSnapshot(input: CaptureSnapshotBuilderInput): CaptureSnapshot {
  const source = input.captureSource ?? { mode: input.captureMode ?? "UNKNOWN" };
  const mode = source.mode;
  const providerId = source.providerId;
  const viewport = {
    width: input.navigation.viewport.width,
    height: input.navigation.viewport.height,
    deviceScaleFactor: input.navigation.viewport.deviceScaleFactor
  };
  const scroll = {
    x: input.navigation.geometry.viewport.scrollX,
    y: input.navigation.geometry.viewport.scrollY
  };
  const pseudo = {
    beforeCount: input.navigation.styleSnapshot.metrics.pseudoBeforeCount,
    afterCount: input.navigation.styleSnapshot.metrics.pseudoAfterCount
  };
  const svg = {
    count: input.navigation.snapshot.metrics.svgCount,
    ...(input.assetReferences ? { inlineCount: input.assetReferences.metrics.inlineSvgAssetCount, externalCount: input.assetReferences.metrics.externalSvgAssetCount } : {})
  };
  const warnings = collectWarnings(input);

  return {
    version: CAPTURE_SNAPSHOT_VERSION,
    capture: {
      mode,
      ...(providerId ? { providerId } : {}),
      source
    },
    document: {
      requestedUrl: input.navigation.requestedUrl,
      finalUrl: input.navigation.finalUrl,
      title: input.navigation.title,
      contentType: input.navigation.contentType,
      capturedAt: input.navigation.timing.completedAt
    },
    viewport,
    scroll,
    metadata: {
      captureMode: mode,
      ...(providerId ? { captureProvider: providerId } : {}),
      ...(input.browser ? { browser: input.browser } : {}),
      ...(input.platform ? { platform: input.platform } : {}),
      captureTime: input.navigation.timing.completedAt,
      ...(input.navigation.snapshot.root.attributes.lang ? { locale: input.navigation.snapshot.root.attributes.lang } : {}),
      theme: "unknown",
      devicePixelRatio: viewport.deviceScaleFactor,
      viewport,
      scroll
    },
    dom: input.navigation.snapshot,
    styles: input.navigation.styleSnapshot,
    geometry: input.navigation.geometry,
    ...(input.assetReferences ? { assets: input.assetReferences } : {}),
    pseudo,
    svg,
    screenshots: { captures: [] },
    warnings,
    metrics: {
      domCount: input.navigation.snapshot.metrics.totalNodeCount,
      styleCount: input.navigation.styleSnapshot.metrics.entryCount,
      geometryCount: input.navigation.geometry.metrics.entryCount,
      svgCount: svg.count,
      pseudoCount: pseudo.beforeCount + pseudo.afterCount,
      assetCount: input.assetReferences?.metrics.assetCount ?? 0,
      warningCount: warnings.length,
      durationMs: input.durationMs
    }
  };
}

function collectWarnings(input: CaptureSnapshotBuilderInput): CaptureSnapshotWarning[] {
  return [
    ...input.navigation.snapshot.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: warning.severity,
      source: "DOM" as const,
      ...(warning.snapshotId ? { sourceNodeId: warning.snapshotId } : {})
    })),
    ...input.navigation.styleSnapshot.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: warning.severity,
      source: "STYLE" as const,
      ...(warning.snapshotId ? { sourceNodeId: warning.snapshotId } : {})
    })),
    ...input.navigation.geometry.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: warning.severity,
      source: "GEOMETRY" as const,
      ...(warning.snapshotId ? { sourceNodeId: warning.snapshotId } : {})
    })),
    ...(input.assetReferences?.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: "WARNING" as const,
      source: "ASSET" as const,
      ...(warning.sampleNodeIds[0] ? { sourceNodeId: warning.sampleNodeIds[0] } : {})
    })) ?? [])
  ];
}
