import { describe, expect, it } from "vitest";
import { parseDesignIr, safeParseDesignIr, validateDesignIrSemantics } from "../src/index.js";

const validDocument = {
  irVersion: "1.0",
  source: { modelVersion: "1.0", layoutInferenceVersion: "1.0", sizingInferenceVersion: "1.0", assetReferenceVersion: "1.0", assetResolutionVersion: "1.0", requestedUrl: "https://example.com", finalUrl: "https://example.com", generatedAt: "2026-07-24T00:00:00.000Z" },
  root: { nodeType: "DOCUMENT", id: "ir_000001", name: "Document", geometry: { x: 0, y: 0, width: 1440, height: 900, coordinateSpace: "DOCUMENT", source: "MEASURED_BOUNDING_RECT" }, visibility: { visible: true, renderPolicy: "RENDER", reasons: [] }, confidence: { layout: 1, horizontalSizing: 1, verticalSizing: 1 }, renderPolicy: "RENDER", viewport: { width: 1440, height: 900 }, documentSize: { width: 1440, height: 900 }, children: [] },
  assetBindings: [], fallbacks: [], metrics: { totalNodeCount: 1, documentNodeCount: 1, frameNodeCount: 0, textNodeCount: 0, imageNodeCount: 0, vectorNodeCount: 0, unsupportedNodeCount: 0, renderedNodeCount: 1, skippedNodeCount: 0, placeholderNodeCount: 0, fallbackNodeCount: 0, assetBindingCount: 0, unresolvedAssetBindingCount: 0, buildTimeMs: 0 }, warnings: []
};

describe("Design IR validation", () => {
  it("parses a valid document and validates its tree", () => { const document = parseDesignIr(validDocument); validateDesignIrSemantics(document); expect(document.root.nodeType).toBe("DOCUMENT"); });
  it("rejects an invalid version", () => { expect(safeParseDesignIr({ ...validDocument, irVersion: "2.0" }).success).toBe(false); });
  it("rejects a leaf with children", () => { const invalid = { ...validDocument, root: { ...validDocument.root, children: [{ nodeType: "TEXT", id: "ir_000002", parentId: "ir_000001", name: "Text", geometry: { x: 0, y: 0, width: 1, height: 1, coordinateSpace: "PARENT", source: "NORMALIZED_PARENT_RELATIVE" }, visibility: { visible: true, renderPolicy: "RENDER", reasons: [] }, confidence: { layout: 1, horizontalSizing: 1, verticalSizing: 1 }, renderPolicy: "RENDER", text: "x", typography: { fontFamilies: [], textAlign: "LEFT" }, sizing: { horizontal: { mode: "CONTENT", confidence: 1, fallback: "USE_CONTENT" }, vertical: { mode: "CONTENT", confidence: 1, fallback: "USE_CONTENT" } }, children: [] }] } }; expect(safeParseDesignIr(invalid).success).toBe(false); });
});
