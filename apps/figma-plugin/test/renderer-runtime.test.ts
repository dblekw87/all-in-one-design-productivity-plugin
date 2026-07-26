import { describe, expect, it } from "vitest";
import type { DesignIrDocument, DesignIrNode } from "@aio/design-ir";
import { FakeFigmaFrameAdapter, FakeFigmaRendererAdapter } from "../src/main/renderer/fake-adapter.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { textPlaceholderFactory } from "../src/main/renderer/factories/text-placeholder-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";
import { vectorNodeFactory } from "../src/main/renderer/factories/vector-node-factory.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";
import { FakeFigmaImageAdapter } from "../src/main/renderer/fake-image-adapter.js";
import { sha256Hex } from "../src/main/assets/runtime/verify-asset-binary.js";
import type { RendererAssetServices } from "../src/main/renderer/runtime/renderer-runtime.js";
import { FakeFigmaSvgAdapter } from "../src/main/renderer/fake-svg-adapter.js";

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

function createRuntime(adapter: FakeFigmaRendererAdapter, services?: RendererAssetServices) {
  const registry = createRendererRegistry();
  registry.register(documentNodeFactory);
  registry.register(frameNodeFactory);
  registry.register(textPlaceholderFactory);
  registry.register(imagePlaceholderFactory);
  registry.register(vectorNodeFactory);
  registry.register(unsupportedNodeFactory);
  return createRendererRuntime(registry, adapter, {}, Date.now, services);
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

  it("replaces a failed child frame with a placeholder and keeps rendering descendants", async () => {
    const document = createDocument();
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    frameAdapter.failVisual = true;
    const result = await createRuntime(adapter, {
      client: { async fetchAsset() { throw new Error("unused"); }, async deleteSession() { /* unused */ } },
      imageAdapter: new FakeFigmaImageAdapter(),
      frameAdapter
    }).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });

    expect(result.status).toBe("COMPLETED");
    expect(result.warnings.some((warning) => warning.code === "NODE_PLACEHOLDER_CREATED")).toBe(true);
    expect(result.metrics.placeholderNodeCount).toBeGreaterThanOrEqual(2);
    expect(result.mappings.some((mapping) => mapping.irNodeId === "ir_000002")).toBe(true);
    expect(result.mappings.some((mapping) => mapping.irNodeId === "ir_000003")).toBe(true);
  });

  it("downloads a used raster binding once, creates one image, and cleans the session", async () => {
    const document = createDocument();
    const image = { id: "ir_000004", nodeType: "IMAGE" as const, name: "Hero image", parentId: "ir_000002", sourceNodeId: "dom_000004", geometry: geometry(0, 60, 100, 80), visibility, confidence, renderPolicy: "RENDER" as const, sizing: sizing(), assetBindingId: "binding_000001", fit: { mode: "FILL" as const }, opacity: 1 };
    const frame = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    frame.children.push(image);
    document.assetBindings.push({ bindingId: "binding_000001", assetId: "asset_000001", resolutionStatus: "RESOLVED", mediaType: "image/png", sha256: "1".repeat(64), byteLength: 4, usageNodeIds: [image.id], renderStrategy: "RASTER_IMAGE" });
    document.metrics.totalNodeCount = 4;
    document.metrics.imageNodeCount = 1;
    document.metrics.renderedNodeCount = 4;
    document.metrics.assetBindingCount = 1;
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const hash = await sha256Hex(bytes);
    document.assetBindings[0]!.sha256 = hash;
    const session = { sessionId: "imp-test", expiresAt: new Date(Date.now() + 60_000).toISOString(), accessToken: "x".repeat(32), assetCount: 1, totalByteLength: 4 };
    const manifest = { manifestVersion: "1.0" as const, session: { sessionId: session.sessionId, expiresAt: session.expiresAt }, assets: [{ assetId: "asset_000001", bindingIds: ["binding_000001"], mediaType: "image/png" as const, byteLength: 4, sha256: hash, transferType: "RASTER_BINARY" as const, downloadPath: "/v1/imports/imp-test/assets/asset_000001", expiresAt: session.expiresAt }], metrics: { assetCount: 1, totalByteLength: 4 } };
    let fetchCount = 0;
    let deleteCount = 0;
    const imageAdapter = new FakeFigmaImageAdapter();
    const result = await createRuntime(new FakeFigmaRendererAdapter(), {
      client: { async fetchAsset() { fetchCount += 1; return { assetId: "asset_000001", mediaType: "image/png", bytes, byteLength: 4, sha256: hash }; }, async deleteSession() { deleteCount += 1; } },
      imageAdapter,
    }).render({ document, assetTransfer: { session, manifest }, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("COMPLETED");
    expect(fetchCount).toBe(1);
    expect(deleteCount).toBe(1);
    expect(imageAdapter.images.size).toBe(1);
    expect(imageAdapter.paints).toHaveLength(1);
  });

  it("downloads sanitized SVG once, creates a vector root, and cleans the session", async () => {
    const document = createDocument();
    const vector = { id: "ir_000005", nodeType: "VECTOR" as const, name: "Logo", parentId: "ir_000002", sourceNodeId: "dom_000005", geometry: geometry(0, 60, 80, 40), visibility, confidence, renderPolicy: "RENDER" as const, sizing: sizing(), vectorStatus: "SANITIZED_SVG_AVAILABLE" as const, assetBindingId: "binding_000002" };
    const frame = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    frame.children.push(vector);
    document.assetBindings.push({ bindingId: "binding_000002", assetId: "asset_000002", resolutionStatus: "RESOLVED", mediaType: "image/svg+xml", sha256: "2".repeat(64), byteLength: 0, usageNodeIds: [vector.id], renderStrategy: "SANITIZED_SVG" });
    document.metrics.totalNodeCount = 4;
    document.metrics.vectorNodeCount = 1;
    document.metrics.renderedNodeCount = 4;
    document.metrics.assetBindingCount = 1;
    const bytes = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0h10v10z\"/></svg>");
    const hash = await sha256Hex(bytes);
    document.assetBindings[0]!.sha256 = hash;
    const session = { sessionId: "imp-svg", expiresAt: new Date(Date.now() + 60_000).toISOString(), accessToken: "x".repeat(32), assetCount: 1, totalByteLength: bytes.byteLength };
    const manifest = { manifestVersion: "1.0" as const, session: { sessionId: session.sessionId, expiresAt: session.expiresAt }, assets: [{ assetId: "asset_000002", bindingIds: ["binding_000002"], mediaType: "image/svg+xml" as const, byteLength: bytes.byteLength, sha256: hash, transferType: "SANITIZED_SVG" as const, downloadPath: "/v1/imports/imp-svg/assets/asset_000002", expiresAt: session.expiresAt }], metrics: { assetCount: 1, totalByteLength: bytes.byteLength } };
    const adapter = new FakeFigmaRendererAdapter();
    const svgAdapter = new FakeFigmaSvgAdapter(adapter);
    let fetchCount = 0;
    let deleteCount = 0;
    const result = await createRuntime(adapter, {
      client: { async fetchAsset() { fetchCount += 1; return { assetId: "asset_000002", mediaType: "image/svg+xml", bytes, byteLength: bytes.byteLength, sha256: hash }; }, async deleteSession() { deleteCount += 1; } },
      imageAdapter: new FakeFigmaImageAdapter(),
      svgAdapter,
    }).render({ document, assetTransfer: { session, manifest }, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("COMPLETED");
    expect(fetchCount).toBe(1);
    expect(deleteCount).toBe(1);
    expect(svgAdapter.created).toHaveLength(1);
    expect(result.mappings.some((mapping) => mapping.irNodeId === vector.id)).toBe(true);
  });
});
