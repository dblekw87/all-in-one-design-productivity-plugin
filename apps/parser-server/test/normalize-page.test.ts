import { describe, expect, it } from "vitest";
import { normalizePage } from "../src/normalization/normalize-page.js";
import type { DomSnapshotDocument } from "@aio/dom-snapshot";
import type { GeometryEvidenceDocument } from "@aio/geometry-evidence";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";

describe("normalizePage", () => {
  it("keeps building a model when style and geometry snapshots are partial", () => {
    const dom: DomSnapshotDocument = {
      snapshotVersion: "1.0",
      source: { requestedUrl: "https://example.com/", finalUrl: "https://example.com/", title: "Example", capturedAt: new Date().toISOString() },
      root: {
        nodeType: "ELEMENT",
        snapshotId: "dom_000001",
        tagName: "body",
        attributes: {},
        semantic: {},
        flags: { hiddenAttribute: false, ariaHidden: false, inert: false, disabled: false, contentEditable: false },
        children: [
          {
            nodeType: "ELEMENT",
            snapshotId: "dom_000002",
            parentSnapshotId: "dom_000001",
            tagName: "section",
            attributes: {},
            semantic: {},
            flags: { hiddenAttribute: false, ariaHidden: false, inert: false, disabled: false, contentEditable: false },
            children: [{ nodeType: "TEXT", snapshotId: "dom_000003", parentSnapshotId: "dom_000002", text: "Hello", flags: { whitespaceOnly: false } }]
          }
        ]
      },
      metrics: { elementNodeCount: 2, textNodeCount: 1, totalNodeCount: 3, maxDepthObserved: 2, iframeCount: 0, canvasCount: 0, svgCount: 0, imageCount: 0, hiddenAttributeCount: 0, ariaHiddenCount: 0, truncatedTextNodeCount: 0, skippedNodeCount: 0, nodeLimitReached: false, depthLimitReached: false, extractionTimeMs: 0 },
      warnings: [],
      extractionOptions: { excludeHidden: true, excludeIframes: true, excludeCanvas: true, includePseudoElements: false }
    };
    const style: StyleSnapshotDocument = {
      styleSnapshotVersion: "1.0",
      source: { domSnapshotVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: dom.source.capturedAt },
      entries: [{ snapshotId: "dom_000001", styles: { display: "block", position: "static", visibility: "visible", opacity: "1" } }],
      metrics: { entryCount: 1, pseudoBeforeCount: 0, pseudoAfterCount: 0, flexContainerCount: 0, gridContainerCount: 0, hiddenByDisplayCount: 0, hiddenByVisibilityCount: 0, transparentElementCount: 0, extractionTimeMs: 0 },
      warnings: []
    };
    const geometry: GeometryEvidenceDocument = {
      geometryVersion: "1.0",
      source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: dom.source.capturedAt },
      viewport: { width: 800, height: 600, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 },
      document: { scrollWidth: 800, scrollHeight: 600, clientWidth: 800, clientHeight: 600 },
      entries: [{ snapshotId: "dom_000001", boundingRect: { x: 0, y: 0, top: 0, right: 800, bottom: 600, left: 0, width: 800, height: 600 }, documentRect: { x: 0, y: 0, width: 800, height: 600 }, boxMetrics: { clientWidth: 800, clientHeight: 600, offsetWidth: 800, offsetHeight: 600, scrollWidth: 800, scrollHeight: 600 }, flags: { zeroWidth: false, zeroHeight: false, zeroArea: false, intersectsViewport: true, fullyInsideViewport: true, overflowsOwnBox: false } }],
      metrics: { entryCount: 1, zeroAreaCount: 0, outsideViewportCount: 0, partiallyVisibleCount: 0, overflowingElementCount: 0, extractionTimeMs: 0 },
      warnings: []
    };

    const model = normalizePage(dom, style, geometry);

    expect(model.root.children[0]).toMatchObject({ nodeType: "ELEMENT", id: "dom_000002" });
    expect(model.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["STYLE_ENTRY_DEFAULTED", "GEOMETRY_ENTRY_DEFAULTED"]));
  });
});
