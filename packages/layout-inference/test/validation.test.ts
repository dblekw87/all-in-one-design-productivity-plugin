import { describe, expect, it } from "vitest";
import { parseLayoutInference } from "../src/index.js";

describe("layout inference contract", () => {
  it("rejects invalid confidence", () => {
    expect(() => parseLayoutInference({ inferenceVersion: "1.0", source: { modelVersion: "1.0", evidenceVersion: "1.0", requestedUrl: "https://example.com", finalUrl: "https://example.com", inferredAt: new Date().toISOString() }, entries: [], metrics: { entryCount: 0, leafCount: 0, flowVerticalCount: 0, flowHorizontalCount: 0, flexRowCount: 0, flexColumnCount: 0, flexWrapCount: 0, gridCount: 0, freeformCount: 0, unknownCount: 0, highConfidenceCount: 0, mediumConfidenceCount: 0, lowConfidenceCount: 0, conflictedEntryCount: 0, inferenceTimeMs: 0 }, warnings: [] })).not.toThrow();
  });
});
