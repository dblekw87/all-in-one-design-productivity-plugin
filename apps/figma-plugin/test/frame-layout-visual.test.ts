import { describe, expect, it } from "vitest";
import type { DesignIrDocument, DesignIrNode } from "@aio/design-ir";
import { FakeFigmaRendererAdapter, FakeFigmaFrameAdapter } from "../src/main/renderer/fake-adapter.js";
import { FakeFigmaImageAdapter } from "../src/main/renderer/fake-image-adapter.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { textPlaceholderFactory } from "../src/main/renderer/factories/text-placeholder-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { vectorNodeFactory } from "../src/main/renderer/factories/vector-node-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";

const edge = { top: 12, right: 16, bottom: 12, left: 16 };
const border = { width: { top: 1, right: 1, bottom: 1, left: 1 }, style: { top: "solid", right: "solid", bottom: "solid", left: "solid" }, color: { top: { r: 0.1, g: 0.2, b: 0.3, a: 1 }, right: { r: 0.1, g: 0.2, b: 0.3, a: 1 }, bottom: { r: 0.1, g: 0.2, b: 0.3, a: 1 }, left: { r: 0.1, g: 0.2, b: 0.3, a: 1 } } };
const confidence = { layout: 0.9, horizontalSizing: 0.9, verticalSizing: 0.9 };
const visibility = { visible: true, renderPolicy: "RENDER" as const, reasons: [] };
const sizing = { horizontal: { mode: "FIXED" as const, confidence: 0.9, fallback: "USE_MEASURED_SIZE" as const }, vertical: { mode: "FIXED" as const, confidence: 0.9, fallback: "USE_MEASURED_SIZE" as const } };

function nodeBase(id: string, nodeType: DesignIrNode["nodeType"], name: string, x: number, y: number, width: number, height: number, parentId?: string) {
  return { id, nodeType, name, ...(parentId ? { parentId } : {}), geometry: { x, y, width, height, coordinateSpace: "PARENT" as const, source: "NORMALIZED_PARENT_RELATIVE" as const }, visibility, confidence, renderPolicy: "RENDER" as const };
}

function createDocument(): DesignIrDocument {
  const absolute = { ...nodeBase("ir_000003", "FRAME", "floating-card", 620, 20, 160, 100, "ir_000002"), renderPolicy: "ABSOLUTE_FALLBACK" as const, layout: { mode: "NONE" as const, primaryAlignment: "START", counterAlignment: "START", padding: edge, positionedChildIds: [], confidence: 0.9, fallbackApplied: true }, sizing, box: { padding: edge, border, radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 } }, visual: { opacity: 0.8, backgrounds: [{ type: "SOLID" as const, color: { r: 0.8, g: 0.9, b: 1, a: 1 } }], border, radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 }, shadows: ["2px 4px 12px rgba(0, 0, 0, 0.2)"], overflow: "HIDDEN" as const }, clipping: { clipsContent: true, source: "STYLE" as const }, children: [] };
  const content = { ...nodeBase("ir_000002", "FRAME", "main-content", 0, 0, 800, 400, "ir_000001"), layout: { mode: "HORIZONTAL" as const, primaryAlignment: "SPACE-BETWEEN", counterAlignment: "STRETCH", gap: { primary: 24 }, padding: edge, positionedChildIds: [absolute.id], confidence: 0.9, fallbackApplied: false }, sizing, box: { padding: edge, border, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 } }, visual: { opacity: 1, backgrounds: [{ type: "SOLID" as const, color: { r: 1, g: 1, b: 1, a: 1 } }], border, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 }, shadows: [], overflow: "VISIBLE" as const }, clipping: { clipsContent: false, source: "FALLBACK" as const }, children: [absolute] };
  return { irVersion: "1.0", source: { modelVersion: "1.0", layoutInferenceVersion: "1.0", sizingInferenceVersion: "1.0", assetReferenceVersion: "1.0", assetResolutionVersion: "1.0", requestedUrl: "https://example.test", finalUrl: "https://example.test", generatedAt: new Date().toISOString() }, root: { ...nodeBase("ir_000001", "DOCUMENT", "Imported Website", 0, 0, 800, 600), geometry: { x: 0, y: 0, width: 800, height: 600, coordinateSpace: "DOCUMENT" as const, source: "MEASURED_BOUNDING_RECT" as const }, viewport: { width: 800, height: 600 }, documentSize: { width: 800, height: 600 }, children: [content] } as DesignIrDocument["root"], assetBindings: [], fallbacks: [], metrics: { totalNodeCount: 3, documentNodeCount: 1, frameNodeCount: 2, textNodeCount: 0, imageNodeCount: 0, vectorNodeCount: 0, unsupportedNodeCount: 0, renderedNodeCount: 3, skippedNodeCount: 0, placeholderNodeCount: 0, fallbackNodeCount: 1, assetBindingCount: 0, unresolvedAssetBindingCount: 0, buildTimeMs: 0 }, warnings: [] };
}

function createRuntime(adapter: FakeFigmaRendererAdapter, frameAdapter: FakeFigmaFrameAdapter) {
  const registry = createRendererRegistry();
  registry.register(documentNodeFactory);
  registry.register(frameNodeFactory);
  registry.register(textPlaceholderFactory);
  registry.register(imagePlaceholderFactory);
  registry.register(vectorNodeFactory);
  registry.register(unsupportedNodeFactory);
  return createRendererRuntime(registry, adapter, {}, Date.now, { client: { async fetchAsset() { throw new Error("not used"); }, async deleteSession() {} }, imageAdapter: new FakeFigmaImageAdapter(), frameAdapter });
}

describe("frame layout and visual mapping", () => {
  it("keeps root CSS scale, maps auto layout and visuals, and separates absolute children", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const progress: string[] = [];
    const result = await createRuntime(adapter, frameAdapter).render({ document: createDocument(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } }, undefined, (event) => progress.push(event.stage));
    expect(result.status).toBe("COMPLETED");
    const root = adapter.getNodeById(result.rootFigmaNodeId ?? "");
    const content = root?.children[0];
    const floating = content?.children[0];
    expect(root?.width).toBe(800);
    expect(root?.height).toBe(600);
    expect(content?.layoutMode).toBe("HORIZONTAL");
    expect(content?.paddingLeft).toBe(16);
    expect(content?.itemSpacing).toBe(24);
    expect(floating?.layoutPositioning).toBe("ABSOLUTE");
    expect(floating?.x).toBe(620);
    expect(floating?.opacity).toBe(0.8);
    expect(frameAdapter.visualCalls).toHaveLength(2);
    expect(progress).toEqual(expect.arrayContaining(["VALIDATING_ROOT_SCALE", "MAPPING_LAYOUT", "APPLYING_AUTO_LAYOUT", "APPLYING_SIZING", "APPLYING_VISUALS", "RECONCILING_GEOMETRY"]));
  });

  it("uses freeform fallback for grid and rolls back generated frames on mapping failure", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "GRID_REFERENCE";
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    frameAdapter.failLayout = true;
    const result = await createRuntime(adapter, frameAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("ROLLED_BACK");
    expect(result.metrics.rollbackNodeCount).toBeGreaterThan(0);
    expect(adapter.nodes.size).toBe(0);
  });
});
