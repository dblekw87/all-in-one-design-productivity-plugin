import { describe, expect, it } from "vitest";
import { buildDesignIr } from "../src/design-ir/build-design-ir.js";
import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { LayoutInferenceDocument } from "@aio/layout-inference";
import type { NormalizedElementNode, NormalizedNode, NormalizedPageModel, ParsedCssValue, NormalizedColor, NormalizedLength, NormalizedNumber } from "@aio/page-model";
import type { ResolvedAssetDocument } from "@aio/resolved-assets";
import type { SizingInferenceDocument } from "@aio/sizing-inference";
import type { DesignIrNode } from "@aio/design-ir";

const length = (value: number): ParsedCssValue<NormalizedLength> => ({ raw: `${value}px`, parsed: true, value: { type: "PX", value } });
const numberValue = (value: number): ParsedCssValue<NormalizedNumber> => ({ raw: String(value), parsed: true, value });
const color = (r: number, g: number, b: number): ParsedCssValue<NormalizedColor> => ({ raw: `rgb(${r}, ${g}, ${b})`, parsed: true, value: { type: "RGBA", r, g, b, a: 1, raw: `rgb(${r}, ${g}, ${b})` } });
const transparent = (): ParsedCssValue<NormalizedColor> => ({ raw: "rgba(0, 0, 0, 0)", parsed: true, value: { type: "RGBA", r: 0, g: 0, b: 0, a: 0, raw: "rgba(0, 0, 0, 0)" } });
const edge = { top: length(0), right: length(0), bottom: length(0), left: length(0) };
const borderStyle = { top: "none", right: "none", bottom: "none", left: "none" };
const borderColor = { top: color(0, 0, 0), right: color(0, 0, 0), bottom: color(0, 0, 0), left: color(0, 0, 0) };

function element(id: string, tagName: string, children: NormalizedNode[], rect: { x: number; y: number; width: number; height: number }, overrides: { display?: "BLOCK" | "INLINE" | "INLINE_BLOCK"; fontWeight?: number; textAlign?: string; background?: [number, number, number] | "transparent"; padding?: number } = {}): NormalizedElementNode {
  const padding = overrides.padding === undefined ? edge : { top: length(overrides.padding), right: length(overrides.padding), bottom: length(overrides.padding), left: length(overrides.padding) };
  return {
    nodeType: "ELEMENT",
    id,
    tagName,
    attributes: {},
    semantic: {},
    state: { hiddenAttribute: false, ariaHidden: false, inert: false, disabled: false, contentEditable: false },
    style: {
      display: { raw: overrides.display?.toLowerCase() ?? "block", parsed: true, value: overrides.display ?? "BLOCK" },
      position: { raw: "static", parsed: true, value: "STATIC" },
      opacity: numberValue(1),
      overflow: "visible",
      box: { padding, margin: edge, borderWidth: edge, borderStyle, borderColor, radius: { topLeft: length(0), topRight: length(0), bottomRight: length(0), bottomLeft: length(0) } },
      typography: { fontFamily: "Inter", fontSize: length(10), fontWeight: numberValue(overrides.fontWeight ?? 700), lineHeight: length(14), letterSpacing: length(0), color: color(71, 85, 105), textAlign: overrides.textAlign ?? "right", whiteSpace: "normal" },
      visual: { backgroundColor: overrides.background === "transparent" ? transparent() : color(...(overrides.background ?? [255, 255, 255])) },
      flex: { isFlexContainer: false },
      grid: { isGridContainer: false },
      sizing: {},
      pseudo: [],
      visibilityEvidence: { hiddenAttribute: false, ariaHidden: false, inert: false, displayNone: false, visibilityHidden: false, opacityZero: false, zeroArea: false, intersectsViewport: true }
    },
    geometry: { viewportRect: rect, documentRect: rect, boxMetrics: { clientWidth: rect.width, clientHeight: rect.height, offsetWidth: rect.width, offsetHeight: rect.height, scrollWidth: rect.width, scrollHeight: rect.height }, viewportState: { intersects: true, fullyInside: true }, zeroSize: { width: false, height: false, area: false }, overflow: { ownBox: false } },
    children
  };
}

describe("buildDesignIr", () => {
  it("merges consecutive inline text fragments and preserves text metrics", () => {
    const root = element("dom_000001", "body", [
      element("dom_000002", "strong", [
        { nodeType: "TEXT", id: "dom_000003", parentId: "dom_000002", text: "Review Score ", whitespaceOnly: false },
        { nodeType: "TEXT", id: "dom_000004", parentId: "dom_000002", text: "86", whitespaceOnly: false }
      ], { x: 20, y: 20, width: 96, height: 14 })
    ], { x: 0, y: 0, width: 200, height: 100 });
    const model: NormalizedPageModel = { modelVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", geometryVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: new Date().toISOString() }, viewport: { width: 200, height: 100, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 }, document: { scrollWidth: 200, scrollHeight: 100, clientWidth: 200, clientHeight: 100 }, root, metrics: { totalNodeCount: 4, elementNodeCount: 2, textNodeCount: 2, flexContainerCount: 0, gridContainerCount: 0, absoluteElementCount: 0, fixedElementCount: 0, stickyElementCount: 0, unparsedLengthCount: 0, unparsedColorCount: 0, unparsedNumberCount: 0, normalizationTimeMs: 0 }, warnings: [] };
    const layout: LayoutInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", evidenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [
        layoutEntry("dom_000001", ["dom_000002"]),
        layoutEntry("dom_000002", ["dom_000003", "dom_000004"])
      ],
      metrics: { entryCount: 2, leafCount: 0, flowVerticalCount: 2, flowHorizontalCount: 0, flexRowCount: 0, flexColumnCount: 0, flexWrapCount: 0, gridCount: 0, freeformCount: 0, unknownCount: 0, highConfidenceCount: 2, mediumConfidenceCount: 0, lowConfidenceCount: 0, conflictedEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const sizing: SizingInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", layoutEvidenceVersion: "1.0", layoutInferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [sizingEntry("dom_000001", 200, 100), sizingEntry("dom_000002", 96, 14)],
      metrics: { entryCount: 2, horizontalContentCount: 0, horizontalStretchCount: 0, horizontalFixedCount: 2, horizontalRelativeCount: 0, horizontalIntrinsicCount: 0, horizontalUnknownCount: 0, verticalContentCount: 0, verticalStretchCount: 0, verticalFixedCount: 2, verticalRelativeCount: 0, verticalIntrinsicCount: 0, verticalUnknownCount: 0, constrainedEntryCount: 0, conflictedEntryCount: 0, lowConfidenceEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const assetReferences: AssetReferenceDocument = { referenceVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", extractedAt: new Date().toISOString() }, assets: [], usages: [], metrics: { assetCount: 0, usageCount: 0, imageElementAssetCount: 0, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 0, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: [] };
    const resolvedAssets: ResolvedAssetDocument = { resolutionVersion: "1.0", source: { assetReferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", resolvedAt: new Date().toISOString() }, assets: [], metrics: { totalReferenceCount: 0, attemptedCount: 0, resolvedCount: 0, blockedCount: 0, failedCount: 0, skippedCount: 0, totalDownloadedBytes: 0, uniqueBinaryCount: 0, duplicateBinaryCount: 0, pngCount: 0, jpegCount: 0, webpCount: 0, gifCount: 0, avifCount: 0, svgCount: 0, sanitizedSvgCount: 0, rejectedSvgCount: 0, resolutionTimeMs: 0 }, warnings: [] };

    const document = buildDesignIr({ model, layout, sizing, assetReferences, resolvedAssets });
    const textNodes = flatten(document.root).filter((node): node is Extract<DesignIrNode, { nodeType: "TEXT" }> => node.nodeType === "TEXT");

    expect(textNodes).toHaveLength(1);
    expect(textNodes[0]).toMatchObject({ text: "Review Score 86", typography: { textAlign: "right", lineHeight: 14, letterSpacing: 0, color: { r: 71 / 255, g: 85 / 255, b: 105 / 255, a: 1 } } });
  });

  it("collapses plain inline wrappers so mixed inline text does not overlap", () => {
    const root = element("dom_000001", "body", [
      element("dom_000002", "span", [
        element("dom_000003", "strong", [
          { nodeType: "TEXT", id: "dom_000004", parentId: "dom_000003", text: "출처", whitespaceOnly: false }
        ], { x: 20, y: 20, width: 18, height: 14 }, { display: "INLINE", background: [255, 255, 255] }),
        { nodeType: "TEXT", id: "dom_000005", parentId: "dom_000002", text: " 공시 요약", whitespaceOnly: false }
      ], { x: 20, y: 20, width: 70, height: 14 }, { display: "INLINE", fontWeight: 400, textAlign: "left", background: [255, 255, 255] })
    ], { x: 0, y: 0, width: 200, height: 100 });
    const model: NormalizedPageModel = { modelVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", geometryVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: new Date().toISOString() }, viewport: { width: 200, height: 100, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 }, document: { scrollWidth: 200, scrollHeight: 100, clientWidth: 200, clientHeight: 100 }, root, metrics: { totalNodeCount: 5, elementNodeCount: 3, textNodeCount: 2, flexContainerCount: 0, gridContainerCount: 0, absoluteElementCount: 0, fixedElementCount: 0, stickyElementCount: 0, unparsedLengthCount: 0, unparsedColorCount: 0, unparsedNumberCount: 0, normalizationTimeMs: 0 }, warnings: [] };
    const layout: LayoutInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", evidenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [layoutEntry("dom_000001", ["dom_000002"]), layoutEntry("dom_000002", ["dom_000003", "dom_000005"]), layoutEntry("dom_000003", ["dom_000004"])],
      metrics: { entryCount: 3, leafCount: 0, flowVerticalCount: 3, flowHorizontalCount: 0, flexRowCount: 0, flexColumnCount: 0, flexWrapCount: 0, gridCount: 0, freeformCount: 0, unknownCount: 0, highConfidenceCount: 3, mediumConfidenceCount: 0, lowConfidenceCount: 0, conflictedEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const sizing: SizingInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", layoutEvidenceVersion: "1.0", layoutInferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [sizingEntry("dom_000001", 200, 100), sizingEntry("dom_000002", 70, 14), sizingEntry("dom_000003", 18, 14)],
      metrics: { entryCount: 3, horizontalContentCount: 0, horizontalStretchCount: 0, horizontalFixedCount: 3, horizontalRelativeCount: 0, horizontalIntrinsicCount: 0, horizontalUnknownCount: 0, verticalContentCount: 0, verticalStretchCount: 0, verticalFixedCount: 3, verticalRelativeCount: 0, verticalIntrinsicCount: 0, verticalUnknownCount: 0, constrainedEntryCount: 0, conflictedEntryCount: 0, lowConfidenceEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const assetReferences: AssetReferenceDocument = { referenceVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", extractedAt: new Date().toISOString() }, assets: [], usages: [], metrics: { assetCount: 0, usageCount: 0, imageElementAssetCount: 0, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 0, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: [] };
    const resolvedAssets: ResolvedAssetDocument = { resolutionVersion: "1.0", source: { assetReferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", resolvedAt: new Date().toISOString() }, assets: [], metrics: { totalReferenceCount: 0, attemptedCount: 0, resolvedCount: 0, blockedCount: 0, failedCount: 0, skippedCount: 0, totalDownloadedBytes: 0, uniqueBinaryCount: 0, duplicateBinaryCount: 0, pngCount: 0, jpegCount: 0, webpCount: 0, gifCount: 0, avifCount: 0, svgCount: 0, sanitizedSvgCount: 0, rejectedSvgCount: 0, resolutionTimeMs: 0 }, warnings: [] };

    const document = buildDesignIr({ model, layout, sizing, assetReferences, resolvedAssets });
    const textNodes = flatten(document.root).filter((node): node is Extract<DesignIrNode, { nodeType: "TEXT" }> => node.nodeType === "TEXT");

    expect(textNodes).toHaveLength(1);
    expect(textNodes[0]).toMatchObject({ text: "출처 공시 요약", parentId: "ir_000002", typography: { textAlign: "left" } });
  });

  it("collapses plain text blocks that only contain inline text and links", () => {
    const root = element("dom_000001", "body", [
      element("dom_000002", "p", [
        { nodeType: "TEXT", id: "dom_000003", parentId: "dom_000002", text: "연결 종목 ", whitespaceOnly: false },
        element("dom_000004", "a", [
          { nodeType: "TEXT", id: "dom_000005", parentId: "dom_000004", text: "삼성전자 005930", whitespaceOnly: false }
        ], { x: 75, y: 20, width: 80, height: 14 }, { display: "INLINE", background: [255, 255, 255] })
      ], { x: 20, y: 20, width: 140, height: 14 }, { display: "BLOCK", fontWeight: 400, textAlign: "left", background: "transparent" })
    ], { x: 0, y: 0, width: 200, height: 100 });
    const model: NormalizedPageModel = { modelVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", geometryVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: new Date().toISOString() }, viewport: { width: 200, height: 100, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 }, document: { scrollWidth: 200, scrollHeight: 100, clientWidth: 200, clientHeight: 100 }, root, metrics: { totalNodeCount: 5, elementNodeCount: 3, textNodeCount: 2, flexContainerCount: 0, gridContainerCount: 0, absoluteElementCount: 0, fixedElementCount: 0, stickyElementCount: 0, unparsedLengthCount: 0, unparsedColorCount: 0, unparsedNumberCount: 0, normalizationTimeMs: 0 }, warnings: [] };
    const layout: LayoutInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", evidenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [layoutEntry("dom_000001", ["dom_000002"]), layoutEntry("dom_000002", ["dom_000003", "dom_000004"]), layoutEntry("dom_000004", ["dom_000005"])],
      metrics: { entryCount: 3, leafCount: 0, flowVerticalCount: 3, flowHorizontalCount: 0, flexRowCount: 0, flexColumnCount: 0, flexWrapCount: 0, gridCount: 0, freeformCount: 0, unknownCount: 0, highConfidenceCount: 3, mediumConfidenceCount: 0, lowConfidenceCount: 0, conflictedEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const sizing: SizingInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", layoutEvidenceVersion: "1.0", layoutInferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [sizingEntry("dom_000001", 200, 100), sizingEntry("dom_000002", 140, 14), sizingEntry("dom_000004", 80, 14)],
      metrics: { entryCount: 3, horizontalContentCount: 0, horizontalStretchCount: 0, horizontalFixedCount: 3, horizontalRelativeCount: 0, horizontalIntrinsicCount: 0, horizontalUnknownCount: 0, verticalContentCount: 0, verticalStretchCount: 0, verticalFixedCount: 3, verticalRelativeCount: 0, verticalIntrinsicCount: 0, verticalUnknownCount: 0, constrainedEntryCount: 0, conflictedEntryCount: 0, lowConfidenceEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const assetReferences: AssetReferenceDocument = { referenceVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", extractedAt: new Date().toISOString() }, assets: [], usages: [], metrics: { assetCount: 0, usageCount: 0, imageElementAssetCount: 0, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 0, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: [] };
    const resolvedAssets: ResolvedAssetDocument = { resolutionVersion: "1.0", source: { assetReferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", resolvedAt: new Date().toISOString() }, assets: [], metrics: { totalReferenceCount: 0, attemptedCount: 0, resolvedCount: 0, blockedCount: 0, failedCount: 0, skippedCount: 0, totalDownloadedBytes: 0, uniqueBinaryCount: 0, duplicateBinaryCount: 0, pngCount: 0, jpegCount: 0, webpCount: 0, gifCount: 0, avifCount: 0, svgCount: 0, sanitizedSvgCount: 0, rejectedSvgCount: 0, resolutionTimeMs: 0 }, warnings: [] };

    const document = buildDesignIr({ model, layout, sizing, assetReferences, resolvedAssets });
    const textNodes = flatten(document.root).filter((node): node is Extract<DesignIrNode, { nodeType: "TEXT" }> => node.nodeType === "TEXT");

    expect(textNodes).toHaveLength(1);
    expect(textNodes[0]).toMatchObject({ text: "연결 종목 삼성전자 005930", parentId: "ir_000002", typography: { textAlign: "left" } });
  });

  it("falls back to CSS box padding when layout evidence has no padding", () => {
    const root = element("dom_000001", "body", [
      element("dom_000002", "p", [
        { nodeType: "TEXT", id: "dom_000003", parentId: "dom_000002", text: "AI 요약 준비 중", whitespaceOnly: false }
      ], { x: 20, y: 20, width: 160, height: 34 }, { display: "BLOCK", fontWeight: 400, textAlign: "left", background: [248, 250, 252], padding: 12 })
    ], { x: 0, y: 0, width: 200, height: 100 });
    const model: NormalizedPageModel = { modelVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", geometryVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", capturedAt: new Date().toISOString() }, viewport: { width: 200, height: 100, deviceScaleFactor: 1, scrollX: 0, scrollY: 0 }, document: { scrollWidth: 200, scrollHeight: 100, clientWidth: 200, clientHeight: 100 }, root, metrics: { totalNodeCount: 3, elementNodeCount: 2, textNodeCount: 1, flexContainerCount: 0, gridContainerCount: 0, absoluteElementCount: 0, fixedElementCount: 0, stickyElementCount: 0, unparsedLengthCount: 0, unparsedColorCount: 0, unparsedNumberCount: 0, normalizationTimeMs: 0 }, warnings: [] };
    const layout: LayoutInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", evidenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [layoutEntry("dom_000001", ["dom_000002"]), layoutEntry("dom_000002", ["dom_000003"])],
      metrics: { entryCount: 2, leafCount: 0, flowVerticalCount: 2, flowHorizontalCount: 0, flexRowCount: 0, flexColumnCount: 0, flexWrapCount: 0, gridCount: 0, freeformCount: 0, unknownCount: 0, highConfidenceCount: 2, mediumConfidenceCount: 0, lowConfidenceCount: 0, conflictedEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const sizing: SizingInferenceDocument = {
      inferenceVersion: "1.0",
      source: { modelVersion: "1.0", layoutEvidenceVersion: "1.0", layoutInferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", inferredAt: new Date().toISOString() },
      entries: [sizingEntry("dom_000001", 200, 100), sizingEntry("dom_000002", 160, 34)],
      metrics: { entryCount: 2, horizontalContentCount: 0, horizontalStretchCount: 0, horizontalFixedCount: 2, horizontalRelativeCount: 0, horizontalIntrinsicCount: 0, horizontalUnknownCount: 0, verticalContentCount: 0, verticalStretchCount: 0, verticalFixedCount: 2, verticalRelativeCount: 0, verticalIntrinsicCount: 0, verticalUnknownCount: 0, constrainedEntryCount: 0, conflictedEntryCount: 0, lowConfidenceEntryCount: 0, inferenceTimeMs: 0 },
      warnings: []
    };
    const assetReferences: AssetReferenceDocument = { referenceVersion: "1.0", source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", modelVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", extractedAt: new Date().toISOString() }, assets: [], usages: [], metrics: { assetCount: 0, usageCount: 0, imageElementAssetCount: 0, inlineSvgAssetCount: 0, externalSvgAssetCount: 0, backgroundAssetCount: 0, pseudoBackgroundAssetCount: 0, dataUrlAssetCount: 0, supportedAssetCount: 0, blockedAssetCount: 0, unsupportedAssetCount: 0, invalidAssetCount: 0, deduplicatedUsageCount: 0, extractionTimeMs: 0 }, warnings: [] };
    const resolvedAssets: ResolvedAssetDocument = { resolutionVersion: "1.0", source: { assetReferenceVersion: "1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/", resolvedAt: new Date().toISOString() }, assets: [], metrics: { totalReferenceCount: 0, attemptedCount: 0, resolvedCount: 0, blockedCount: 0, failedCount: 0, skippedCount: 0, totalDownloadedBytes: 0, uniqueBinaryCount: 0, duplicateBinaryCount: 0, pngCount: 0, jpegCount: 0, webpCount: 0, gifCount: 0, avifCount: 0, svgCount: 0, sanitizedSvgCount: 0, rejectedSvgCount: 0, resolutionTimeMs: 0 }, warnings: [] };

    const document = buildDesignIr({ model, layout, sizing, assetReferences, resolvedAssets });
    const frameNode = flatten(document.root).find((node): node is Extract<DesignIrNode, { nodeType: "FRAME" }> => node.nodeType === "FRAME" && node.sourceNodeId === "dom_000002");

    expect(frameNode?.layout.padding).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(frameNode?.box.padding).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
  });
});

function flatten(node: DesignIrNode): DesignIrNode[] {
  return [node, ...("children" in node ? (node.children ?? []).flatMap(flatten) : [])];
}

function layoutEntry(nodeId: string, flowChildIds: string[]): LayoutInferenceDocument["entries"][number] {
  return {
    nodeId,
    mode: "FLOW_VERTICAL",
    confidence: 0.9,
    source: { display: "block", position: "static" },
    candidates: [],
    reasons: [],
    conflicts: [],
    arrangement: { primaryAxis: "VERTICAL", wraps: false },
    spacing: {},
    alignment: { primary: "START", counter: "START" },
    children: { flowChildIds, positionedChildIds: [], excludedChildIds: [] },
    fallback: "USE_INFERRED_FLOW"
  };
}

function sizingEntry(nodeId: string, width: number, height: number): SizingInferenceDocument["entries"][number] {
  const axis = (measuredSize: number) => ({ mode: "FIXED" as const, measuredSize, confidence: 0.9, candidates: [], sourceValue: { raw: `${measuredSize}px`, parsedKind: "PX" as const } });
  return { nodeId, horizontal: axis(width), vertical: axis(height), constraints: {}, reasons: [], conflicts: [], fallback: "USE_MEASURED_FIXED_SIZE" };
}
