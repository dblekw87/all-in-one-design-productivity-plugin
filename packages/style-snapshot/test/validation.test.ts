import { describe, expect, it } from "vitest";
import { parseStyleSnapshot } from "../src/index.js";

const snapshot = {
  styleSnapshotVersion: "1.0",
  source: { domSnapshotVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: "2026-07-24T00:00:00.000Z" },
  entries: [{ snapshotId: "dom_000001", styles: { display: "flex", backgroundColor: "rgb(1, 2, 3)" }, pseudo: { before: { pseudoType: "BEFORE", content: "\"x\"", styles: { display: "block" } } } }],
  metrics: { entryCount: 1, pseudoBeforeCount: 1, pseudoAfterCount: 0, flexContainerCount: 1, gridContainerCount: 0, hiddenByDisplayCount: 0, hiddenByVisibilityCount: 0, transparentElementCount: 0, extractionTimeMs: 1 },
  warnings: []
};

describe("style snapshot validation", () => {
  it("parses an allowlisted style snapshot", () => expect(parseStyleSnapshot(snapshot).entries).toHaveLength(1));
  it("rejects an invalid version", () => expect(() => parseStyleSnapshot({ ...snapshot, styleSnapshotVersion: "2.0" })).toThrow());
  it("rejects an unknown property", () => expect(() => parseStyleSnapshot({ ...snapshot, entries: [{ snapshotId: "dom_000001", styles: { unknownProperty: "10px" } }] })).toThrow());
});
