import { describe, expect, it } from "vitest";
import type { DesignIrDocument, DesignIrNode } from "@aio/design-ir";
import { FakeFigmaRendererAdapter } from "../src/main/renderer/fake-adapter.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { textPlaceholderFactory } from "../src/main/renderer/factories/text-placeholder-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";
import { vectorPlaceholderFactory } from "../src/main/renderer/factories/vector-placeholder-factory.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";

const edges = () => ({ top: 8, right: 8, bottom: 8, left: 8 });
const corners = () => ({ topLeft: 4, topRight: 4, bottomRight: 4, bottomLeft: 4 });
const geometry = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  coordinateSpace: "PARENT" as const,
  source: "NORMALIZED_PARENT_RELATIVE" as const,
});
const confidence = { layout: 0.9, horizontalSizing: 0.8, verticalSizing: 0.8 };
const visibility = { visible: true, renderPolicy: "RENDER" as const, reasons: [] };
const sizing = () => ({
  horizontal: { mode: "STRETCH" as const, confidence: 0.8, fallback: "USE_STRETCH" as const },
  vertical: { mode: "CONTENT" as const, confidence: 0.8, fallback: "USE_CONTENT" as const },
});
const border = () => ({ width: edges(), style: { top: "none", right: "none", bottom: "none", left: "none" }, color: edges().top === 8 ? { top: undefined, right: undefined, bottom: undefined, left: undefined } : undefined });

function baseNode(id: string, nodeType: DesignIrNode["nodeType"], name: string, parentId?: string) {
  return { id, nodeType, name, ...(parentId ? { parentId } : {}), sourceNodeId: id.replace("ir_", "dom_"), geometry: geometry(0, 0, 100, 50), visibility, confidence, renderPolicy: "RENDER" as const };
}

function createDocument(): DesignIrDocument {
  const text = {
    ...baseNode("ir_000003", "TEXT", "Hello", "ir_000002"),
    text: "Hello",
    typography: { fontFamilies: ["Inter"], fontSize: 16, fontWeight: 400, textAlign: "LEFT" },
    sizing: sizing(),
  };
  const frame = {
    ...baseNode("ir_000002", "FRAME", "Content", "ir_000001"),
    layout: { mode: "VERTICAL" as const, primaryAlignment: "START", counterAlignment: "STRETCH", padding: edges(), positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
    sizing: sizing(),
    box: { padding: edges(), border: border(), radius: corners() },
    visual: { opacity: 1, backgrounds: [], border: border(), radius: corners(), shadows: [], overflow: "VISIBLE" as const },
    clipping: { clipsContent: false, source: "FALLBACK" as const },
    children: [text],
  };
  const root = {
    ...baseNode("ir_000001", "DOCUMENT", "Imported Website"),
    geometry: { ...geometry(0, 0, 400, 300), coordinateSpace: "DOCUMENT" as const, source: "FALLBACK" as const },
    viewport: { width: 400, height: 300 },
    documentSize: { width: 400, height: 300 },
    children: [frame],
  } as DesignIrDocument["root"];
  return {
    irVersion: "1.0",
    source: { modelVersion: "1.0", layoutInferenceVersion: "1.0", sizingInferenceVersion: "1.0", assetReferenceVersion: "1.0", assetResolutionVersion: "1.0", requestedUrl: "https://example.test", finalUrl: "https://example.test", generatedAt: new Date().toISOString() },
    root,
    assetBindings: [],
    fallbacks: [],
    metrics: { totalNodeCount: 3, documentNodeCount: 1, frameNodeCount: 1, textNodeCount: 1, imageNodeCount: 0, vectorNodeCount: 0, unsupportedNodeCount: 0, renderedNodeCount: 3, skippedNodeCount: 0, placeholderNodeCount: 0, fallbackNodeCount: 0, assetBindingCount: 0, unresolvedAssetBindingCount: 0, buildTimeMs: 0 },
    warnings: [],
  };
}

function createRuntime(adapter: FakeFigmaRendererAdapter) {
  const registry = createRendererRegistry();
  registry.register(documentNodeFactory);
  registry.register(frameNodeFactory);
  registry.register(textPlaceholderFactory);
  registry.register(imagePlaceholderFactory);
  registry.register(vectorPlaceholderFactory);
  registry.register(unsupportedNodeFactory);
  return createRendererRuntime(registry, adapter);
}

describe("Figma renderer runtime", () => {
  it("creates the IR tree in preorder and preserves mappings", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const progress: string[] = [];
    const result = await createRuntime(adapter).render({ document: createDocument(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: true } }, undefined, (event) => progress.push(event.stage));

    expect(result.status).toBe("COMPLETED");
    expect(result.mappings).toHaveLength(3);
    expect(result.metrics.createdNodeCount).toBe(3);
    expect(result.metrics.placeholderNodeCount).toBe(1);
    expect(progress).toContain("VALIDATING_IR");
    expect(progress).toContain("COMPLETED");
    const root = adapter.getNodeById(result.rootFigmaNodeId ?? "");
    expect(root?.children).toHaveLength(1);
    expect(root?.children[0]?.children).toHaveLength(1);
  });

  it("rolls back nodes when cancelled before rendering", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const controller = new AbortController();
    controller.abort();
    const result = await createRuntime(adapter).render({ document: createDocument(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } }, controller.signal);

    expect(result.status).toBe("CANCELLED");
    expect(result.metrics.rollbackNodeCount).toBe(0);
    expect(adapter.nodes.size).toBe(0);
  });

  it("supports skipping placeholder nodes without failing the render", async () => {
    const document = createDocument();
    const result = await createRuntime(new FakeFigmaRendererAdapter()).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "SKIP", rollbackOnError: true, selectRootOnComplete: false } });

    expect(result.status).toBe("COMPLETED");
    expect(result.metrics.skippedNodeCount).toBe(1);
    expect(result.mappings).toHaveLength(2);
  });
});
