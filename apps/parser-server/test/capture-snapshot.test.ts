import { describe, expect, it } from "vitest";
import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { BrowserNavigationResult } from "../src/browser/browser-runtime.js";
import { buildCaptureSnapshot } from "../src/snapshot/capture-snapshot-builder.js";
import { summarizeCaptureSnapshot } from "../src/snapshot/capture-snapshot-diagnostics.js";
import { validateCaptureSnapshot } from "../src/snapshot/capture-snapshot-validator.js";
import { captureSnapshotVersionRegistry } from "../src/snapshot/capture-snapshot-version-registry.js";

describe("universal capture snapshot", () => {
  it("builds, validates, and summarizes PUBLIC_URL snapshots", () => {
    const snapshot = buildCaptureSnapshot({
      captureSource: {
        mode: "PUBLIC_URL",
        providerId: "public-url",
        inputUrl: "https://example.com",
        normalizedUrl: "https://example.com/"
      },
      navigation: navigationFixture(),
      assetReferences: assetReferencesFixture(),
      durationMs: 42,
      browser: "playwright",
      platform: "parser-server"
    });

    expect(snapshot.version).toBe("1.0");
    expect(snapshot.capture.mode).toBe("PUBLIC_URL");
    expect(snapshot.metadata.captureProvider).toBe("public-url");
    expect(snapshot.metrics).toMatchObject({
      domCount: 3,
      styleCount: 2,
      geometryCount: 2,
      svgCount: 1,
      pseudoCount: 3,
      assetCount: 2,
      warningCount: 4,
      durationMs: 42
    });
    expect(validateCaptureSnapshot(snapshot)).toMatchObject({ ok: true });
    expect(summarizeCaptureSnapshot(snapshot)).toMatchObject({
      version: "1.0",
      captureMode: "PUBLIC_URL",
      finalUrl: "https://example.com/",
      domCount: 3
    });
  });

  it("rejects semantic metric mismatches", () => {
    const snapshot = buildCaptureSnapshot({
      captureSource: { mode: "PUBLIC_URL", providerId: "public-url" },
      navigation: navigationFixture(),
      durationMs: 1
    });
    const result = validateCaptureSnapshot({
      ...snapshot,
      metrics: { ...snapshot.metrics, warningCount: snapshot.metrics.warningCount + 1 }
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid snapshot");
    expect(result.issues.some((issue) => issue.path === "metrics.warningCount")).toBe(true);
  });

  it("registers snapshot version 1.0", () => {
    expect(captureSnapshotVersionRegistry.supports("1.0")).toBe(true);
    expect(captureSnapshotVersionRegistry.list()).toEqual(["1.0"]);
  });
});

function navigationFixture(): BrowserNavigationResult {
  return {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    statusCode: 200,
    title: "Example",
    contentType: "text/html",
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    timing: {
      startedAt: "2026-07-26T00:00:00.000Z",
      completedAt: "2026-07-26T00:00:00.042Z",
      durationMs: 42
    },
    security: {
      totalRequests: 1,
      allowedRequests: 1,
      blockedRequests: 0,
      redirectCount: 0,
      blockedByCode: {},
      warnings: []
    },
    snapshot: {
      snapshotVersion: "1.0",
      source: {
        requestedUrl: "https://example.com",
        finalUrl: "https://example.com/",
        title: "Example",
        capturedAt: "2026-07-26T00:00:00.042Z"
      },
      root: {
        nodeType: "ELEMENT",
        snapshotId: "node_1",
        tagName: "HTML",
        attributes: { lang: "ko-KR" },
        semantic: {},
        flags: {
          hiddenAttribute: false,
          ariaHidden: false,
          inert: false,
          disabled: false,
          contentEditable: false
        },
        children: []
      },
      metrics: {
        elementNodeCount: 2,
        textNodeCount: 1,
        totalNodeCount: 3,
        maxDepthObserved: 1,
        iframeCount: 0,
        canvasCount: 0,
        svgCount: 1,
        imageCount: 1,
        hiddenAttributeCount: 0,
        ariaHiddenCount: 0,
        truncatedTextNodeCount: 0,
        skippedNodeCount: 0,
        nodeLimitReached: false,
        depthLimitReached: false,
        extractionTimeMs: 10
      },
      warnings: [
        {
          code: "TEXT_NODE_TRUNCATED",
          message: "Text was truncated.",
          severity: "WARNING",
          snapshotId: "node_2"
        }
      ],
      extractionOptions: {
        excludeHidden: true,
        excludeIframes: true,
        excludeCanvas: true,
        includePseudoElements: true
      }
    },
    styleSnapshot: {
      styleSnapshotVersion: "1.0",
      source: {
        domSnapshotVersion: "1.0",
        requestedUrl: "https://example.com",
        finalUrl: "https://example.com/",
        capturedAt: "2026-07-26T00:00:00.042Z"
      },
      entries: [],
      metrics: {
        entryCount: 2,
        pseudoBeforeCount: 1,
        pseudoAfterCount: 2,
        flexContainerCount: 0,
        gridContainerCount: 0,
        hiddenByDisplayCount: 0,
        hiddenByVisibilityCount: 0,
        transparentElementCount: 0,
        extractionTimeMs: 8
      },
      warnings: [
        {
          code: "PSEUDO_CONTENT_UNSUPPORTED",
          message: "Pseudo content was skipped.",
          severity: "INFO",
          snapshotId: "node_1"
        }
      ]
    },
    geometry: {
      geometryVersion: "1.0",
      source: {
        domSnapshotVersion: "1.0",
        styleSnapshotVersion: "1.0",
        requestedUrl: "https://example.com",
        finalUrl: "https://example.com/",
        capturedAt: "2026-07-26T00:00:00.042Z"
      },
      viewport: {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        scrollX: 0,
        scrollY: 12
      },
      document: {
        scrollWidth: 1440,
        scrollHeight: 1800,
        clientWidth: 1440,
        clientHeight: 900
      },
      entries: [],
      metrics: {
        entryCount: 2,
        zeroAreaCount: 0,
        outsideViewportCount: 0,
        partiallyVisibleCount: 0,
        overflowingElementCount: 0,
        extractionTimeMs: 6
      },
      warnings: [
        {
          code: "ZERO_AREA_ELEMENT",
          message: "Zero area element.",
          severity: "WARNING",
          snapshotId: "node_3"
        }
      ]
    }
  };
}

function assetReferencesFixture(): AssetReferenceDocument {
  return {
    referenceVersion: "1.0",
    source: {
      domSnapshotVersion: "1.0",
      styleSnapshotVersion: "1.0",
      modelVersion: "1.0",
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com/",
      extractedAt: "2026-07-26T00:00:00.042Z"
    },
    assets: [],
    usages: [],
    metrics: {
      assetCount: 2,
      usageCount: 2,
      imageElementAssetCount: 1,
      inlineSvgAssetCount: 1,
      externalSvgAssetCount: 0,
      backgroundAssetCount: 0,
      pseudoBackgroundAssetCount: 0,
      dataUrlAssetCount: 0,
      supportedAssetCount: 2,
      blockedAssetCount: 0,
      unsupportedAssetCount: 0,
      invalidAssetCount: 0,
      deduplicatedUsageCount: 0,
      extractionTimeMs: 5
    },
    warnings: [
      {
        code: "ASSET_MEDIA_TYPE_UNKNOWN",
        count: 1,
        sampleNodeIds: ["node_4"],
        message: "Unknown asset media type."
      }
    ]
  };
}
