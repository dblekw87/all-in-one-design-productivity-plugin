import { describe, expect, it, vi } from "vitest";
import { BrowserAnalyzeService } from "../src/analyze/browser-analyze-service.js";
import type { BrowserRuntime } from "../src/browser/browser-runtime.js";
import type { DomSnapshotDocument } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import type { GeometryEvidenceDocument } from "@aio/geometry-evidence";

const command = {
  requestId: "req_test" as const,
  startedAtMs: 100,
  nowMs: () => 140,
  request: {
    contractVersion: "1.0" as const,
    url: "https://example.com",
    viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
    capture: { mode: "VIEWPORT" as const },
    options: {
      excludeHidden: true,
      excludeIframes: true,
      excludeCanvas: true,
      includePseudoElements: true
    }
  },
  target: {
    normalizedUrl: "https://example.com/",
    hostname: "example.com",
    protocol: "https:" as const,
    resolvedAddresses: [{ address: "93.184.216.34", family: 4 as const }],
    validatedAt: "2026-07-24T00:00:00.000Z"
  }
};

describe("browser analyze service", () => {
  it("maps navigation metadata into analyze responses", async () => {
    const runtime: BrowserRuntime = {
      navigate: vi.fn(async () => ({
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        title: "Example",
        contentType: "text/html",
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        timing: {
          startedAt: "2026-07-24T00:00:00.000Z",
          completedAt: "2026-07-24T00:00:00.040Z",
          durationMs: 40
        },
        security: {
          totalRequests: 3,
          allowedRequests: 3,
          blockedRequests: 0,
          redirectCount: 0,
          blockedByCode: {},
          warnings: []
        },
        snapshot: {
          snapshotVersion: "1.0" as const,
          source: {
            requestedUrl: "https://example.com/",
            finalUrl: "https://example.com/",
            title: "Example",
            capturedAt: "2026-07-24T00:00:00.000Z"
          },
          root: {
            nodeType: "ELEMENT",
            snapshotId: "dom_000001",
            tagName: "body",
            attributes: {},
            semantic: {},
            flags: { hiddenAttribute: false, ariaHidden: false, inert: false, disabled: false, contentEditable: false },
            children: []
          },
          metrics: {
            elementNodeCount: 1, textNodeCount: 0, totalNodeCount: 1, maxDepthObserved: 0,
            iframeCount: 0, canvasCount: 0, svgCount: 0, imageCount: 0, hiddenAttributeCount: 0,
            ariaHiddenCount: 0, truncatedTextNodeCount: 0, skippedNodeCount: 0,
            nodeLimitReached: false, depthLimitReached: false, extractionTimeMs: 0
          },
          warnings: [],
          extractionOptions: { excludeHidden: true, excludeIframes: true, excludeCanvas: true, includePseudoElements: true }
        } satisfies DomSnapshotDocument,
        styleSnapshot: {
          styleSnapshotVersion: "1.0",
          source: {
            domSnapshotVersion: "1.0",
            requestedUrl: "https://example.com/",
            finalUrl: "https://example.com/",
            capturedAt: "2026-07-24T00:00:00.000Z"
          },
          entries: [{ snapshotId: "dom_000001", styles: { display: "block" } }],
          metrics: {
            entryCount: 1, pseudoBeforeCount: 0, pseudoAfterCount: 0, flexContainerCount: 0,
            gridContainerCount: 0, hiddenByDisplayCount: 0, hiddenByVisibilityCount: 0,
            transparentElementCount: 0, extractionTimeMs: 1
          },
          warnings: []
        } satisfies StyleSnapshotDocument
        ,geometry: {
          geometryVersion: "1.0",
          source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: "2026-07-24T00:00:00.000Z" },
          viewport: { width: 1440, height: 1200, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 },
          document: { scrollWidth: 1440, scrollHeight: 1200, clientWidth: 1440, clientHeight: 1200 },
          entries: [{ snapshotId: "dom_000001", boundingRect: { x: 0, y: 0, top: 0, right: 10, bottom: 10, left: 0, width: 10, height: 10 }, documentRect: { x: 0, y: 0, width: 10, height: 10 }, boxMetrics: { clientWidth: 10, clientHeight: 10, offsetWidth: 10, offsetHeight: 10, scrollWidth: 10, scrollHeight: 10 }, flags: { zeroWidth: false, zeroHeight: false, zeroArea: false, intersectsViewport: true, fullyInsideViewport: true, overflowsOwnBox: false } }],
          metrics: { entryCount: 1, zeroAreaCount: 0, outsideViewportCount: 0, partiallyVisibleCount: 0, overflowingElementCount: 0, extractionTimeMs: 1 },
          warnings: []
        } satisfies GeometryEvidenceDocument
      })),
      close: vi.fn()
    };
    const service = new BrowserAnalyzeService(runtime, 15_000);

    const response = await service.analyze(command);

    expect(runtime.navigate).toHaveBeenCalledWith(
      {
        url: "https://example.com/",
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        timeoutMs: 15_000,
        extraction: {
          excludeHidden: true,
          excludeIframes: true,
          excludeCanvas: true,
          includePseudoElements: true,
          maxDepth: 100,
          maxNodes: 5_000,
          maxTextNodeLength: 10_000
        },
        styleExtraction: {
          maxDepth: 100,
          maxEntries: 5_000,
          maxWarnings: 100,
          includePseudoElements: true
        },
        geometryExtraction: {
          maxDepth: 100,
          maxEntries: 5_000
        }
      },
      undefined
    );
    expect(response).toMatchObject({
      status: "DESIGN_IR_BUILT",
      navigation: {
        statusCode: 200,
        title: "Example",
        contentType: "text/html"
      },
      security: {
        totalRequests: 3,
        allowedRequests: 3,
        blockedRequests: 0
      },
      metrics: {
        processingTimeMs: 40,
        domNodeCount: 1,
        designNodeCount: expect.any(Number),
        assetCount: 0
      }
    });
    expect(response.snapshot).toBeDefined();
    expect(response.styleSnapshot).toBeDefined();
    expect(response.geometry).toBeDefined();
    expect(response.normalizedModel).toMatchObject({
      modelVersion: "1.0",
      root: { id: "dom_000001", nodeType: "ELEMENT" },
      metrics: { totalNodeCount: 1, elementNodeCount: 1 }
    });
    expect(response.layoutEvidence).toMatchObject({ evidenceVersion: "1.0" });
    expect(response.layoutInference).toMatchObject({ inferenceVersion: "1.0", metrics: { entryCount: 1 } });
    expect(response.sizingInference).toMatchObject({ inferenceVersion: "1.0", metrics: { entryCount: 1 } });
    expect(response.assetReferences).toMatchObject({ referenceVersion: "1.0", metrics: { assetCount: 0 } });
    expect(response.resolvedAssets).toMatchObject({ resolutionVersion: "1.0", metrics: { resolvedCount: 0 } });
    expect(response.document).toMatchObject({ irVersion: "1.0", root: { nodeType: "DOCUMENT" } });
    expect(response.metrics.domNodeCount).toBe(1);
    expect(response.metrics.designNodeCount).toBeGreaterThan(0);
  });

  it("normalizes browser errors into analyze warnings", async () => {
    const runtime: BrowserRuntime = {
      navigate: vi.fn(async () => {
        throw new Error("boom");
      }),
      close: vi.fn()
    };
    const service = new BrowserAnalyzeService(runtime, 15_000);

    const response = await service.analyze(command);

    expect(response.status).toBe("NOT_IMPLEMENTED");
    expect(response.warnings[0]).toMatchObject({
      code: "BROWSER_NAVIGATION_FAILED",
      severity: "ERROR"
    });
  });
});
