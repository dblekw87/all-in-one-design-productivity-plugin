import { describe, expect, it } from "vitest";
import { parseDomSnapshot } from "../src/index.js";

const validSnapshot = {
  snapshotVersion: "1.0",
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
    children: [{
      nodeType: "TEXT",
      snapshotId: "dom_000002",
      parentSnapshotId: "dom_000001",
      text: "Hello",
      flags: { whitespaceOnly: false }
    }]
  },
  metrics: {
    elementNodeCount: 1, textNodeCount: 1, totalNodeCount: 2, maxDepthObserved: 0,
    iframeCount: 0, canvasCount: 0, svgCount: 0, imageCount: 0, hiddenAttributeCount: 0,
    ariaHiddenCount: 0, truncatedTextNodeCount: 0, skippedNodeCount: 0,
    nodeLimitReached: false, depthLimitReached: false, extractionTimeMs: 1
  },
  warnings: [],
  extractionOptions: { excludeHidden: true, excludeIframes: true, excludeCanvas: true, includePseudoElements: true }
};

describe("dom snapshot validation", () => {
  it("parses a valid versioned snapshot", () => expect(parseDomSnapshot(validSnapshot).root.tagName).toBe("body"));
  it("rejects an invalid version", () => expect(() => parseDomSnapshot({ ...validSnapshot, snapshotVersion: "2.0" })).toThrow());
  it("rejects duplicate ids and invalid parents", () => {
    const duplicate = structuredClone(validSnapshot);
    const child = duplicate.root.children[0];
    if (child?.nodeType === "TEXT") child.snapshotId = "dom_000001";
    expect(() => parseDomSnapshot(duplicate)).toThrow();
  });
});
