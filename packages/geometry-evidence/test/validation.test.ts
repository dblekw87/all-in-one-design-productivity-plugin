import { describe, expect, it } from "vitest";
import { parseGeometryEvidence } from "../src/index.js";

const document = {
  geometryVersion: "1.0",
  source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: "2026-07-24T00:00:00.000Z" },
  viewport: { width: 1440, height: 1200, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 },
  document: { scrollWidth: 1440, scrollHeight: 1200, clientWidth: 1440, clientHeight: 1200 },
  entries: [{ snapshotId: "dom_000001", boundingRect: { x: 0, y: 0, top: 0, right: 10, bottom: 10, left: 0, width: 10, height: 10 }, documentRect: { x: 0, y: 0, width: 10, height: 10 }, boxMetrics: { clientWidth: 10, clientHeight: 10, offsetWidth: 10, offsetHeight: 10, scrollWidth: 10, scrollHeight: 10 }, flags: { zeroWidth: false, zeroHeight: false, zeroArea: false, intersectsViewport: true, fullyInsideViewport: true, overflowsOwnBox: false } }],
  metrics: { entryCount: 1, zeroAreaCount: 0, outsideViewportCount: 0, partiallyVisibleCount: 0, overflowingElementCount: 0, extractionTimeMs: 1 },
  warnings: []
};

describe("geometry evidence validation", () => {
  it("parses valid finite geometry", () => expect(parseGeometryEvidence(document).entries).toHaveLength(1));
  it("rejects invalid versions", () => expect(() => parseGeometryEvidence({ ...document, geometryVersion: "2.0" })).toThrow());
  it("rejects invalid rect relationships", () => {
    const entry = document.entries[0]!;
    expect(() => parseGeometryEvidence({ ...document, entries: [{ ...entry, boundingRect: { ...entry.boundingRect, right: 11 } }] })).toThrow();
  });
});
