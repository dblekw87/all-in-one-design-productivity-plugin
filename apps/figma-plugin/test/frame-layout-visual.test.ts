import { describe, expect, it } from "vitest";
import type { DesignIrDocument, DesignIrNode } from "@aio/design-ir";
import { FakeFigmaRendererAdapter, FakeFigmaFrameAdapter } from "../src/main/renderer/fake-adapter.js";
import { FakeFigmaImageAdapter } from "../src/main/renderer/fake-image-adapter.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { textNodeFactory } from "../src/main/renderer/factories/text-node-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { vectorNodeFactory } from "../src/main/renderer/factories/vector-node-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";
import { mapChildLayout, mapLayoutMode } from "../src/main/renderer/layout/contracts/layout-mapping.js";
import { mapFrameVisual } from "../src/main/renderer/visual/contracts/visual-mapping.js";
import { FakeFigmaTextAdapter } from "../src/main/renderer/text/adapter/fake-figma-font-adapter.js";

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

function createRuntime(adapter: FakeFigmaRendererAdapter, frameAdapter: FakeFigmaFrameAdapter, textAdapter?: FakeFigmaTextAdapter) {
  const registry = createRendererRegistry();
  registry.register(documentNodeFactory);
  registry.register(frameNodeFactory);
  registry.register(textNodeFactory);
  registry.register(imagePlaceholderFactory);
  registry.register(vectorNodeFactory);
  registry.register(unsupportedNodeFactory);
  return createRendererRuntime(registry, adapter, {}, Date.now, { client: { async fetchAsset() { throw new Error("not used"); }, async deleteSession() {} }, imageAdapter: new FakeFigmaImageAdapter(), frameAdapter, ...(textAdapter ? { textAdapter } : {}) });
}

describe("frame layout and visual mapping", () => {
  it("does not apply browser flow coordinates twice and uses the vertical axis as primary sizing", () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    content.sizing.horizontal.mode = "STRETCH";
    content.sizing.vertical.mode = "FIXED";
    const child = { ...content.children[0], renderPolicy: "RENDER" as const } as DesignIrNode;
    content.layout.positionedChildIds = [];
    const mapping = mapChildLayout(child, content);
    const layout = mapLayoutMode(content);
    expect(mapping.x).toBe(0);
    expect(mapping.y).toBe(0);
    expect(layout.primaryAxisSizingMode).toBe("FIXED");
    expect(layout.counterAxisSizingMode).toBe("AUTO");
  });

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
    expect(result.layoutMeasurements?.map((item) => item.irNodeId)).toContain("ir_000002");
    expect(result.layoutReconstruction?.sections.map((item) => item.irNodeId)).toContain("ir_000002");
    expect(result.layoutReconstruction?.rootWidth).toBe(800);
    expect(progress).toEqual(expect.arrayContaining(["VALIDATING_ROOT_SCALE", "MAPPING_LAYOUT", "APPLYING_AUTO_LAYOUT", "APPLYING_SIZING", "APPLYING_VISUALS", "RECONCILING_GEOMETRY"]));
  });

  it("preserves one-sided card accent borders without turning the whole stroke into the accent color", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    const grey = { r: 0.89, g: 0.91, b: 0.94, a: 1 };
    const red = { r: 0.86, g: 0.14, b: 0.12, a: 1 };
    content.visual.border = {
      width: { top: 1, right: 1, bottom: 1, left: 4 },
      style: { top: "solid", right: "solid", bottom: "solid", left: "solid" },
      color: { top: grey, right: grey, bottom: grey, left: red }
    };
    content.box.border = content.visual.border;
    const visual = mapFrameVisual(content);
    expect(visual.strokeWeight).toBe(1);
    expect(visual.strokes[0]).toMatchObject({ color: { r: grey.r, g: grey.g, b: grey.b } });

    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const result = await createRuntime(adapter, frameAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("COMPLETED");
    const root = adapter.getNodeById(result.rootFigmaNodeId ?? "");
    const renderedContent = root?.children[0];
    const accent = renderedContent?.children.find((child) => child.name === "border-left accent");
    expect(accent).toMatchObject({ x: 0, y: 0, width: 4, height: 400, layoutPositioning: "ABSOLUTE" });
    expect(accent?.fills).toEqual([{ type: "SOLID", color: { r: red.r, g: red.g, b: red.b }, opacity: 1 }]);
  });

  it("maps CSS shadows to Figma-compatible effect fields only", () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.visual.shadows = ["0px 10px 20px 4px rgba(15, 23, 42, 0.12)"];
    const visual = mapFrameVisual(content);
    expect(visual.effects).toEqual([{
      type: "DROP_SHADOW",
      color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.12 },
      offset: { x: 0, y: 10 },
      radius: 20,
      visible: true,
      blendMode: "NORMAL"
    }]);
    expect(Object.keys(visual.effects[0] ?? {})).not.toContain("spread");
    expect(Object.keys(visual.effects[0] ?? {})).not.toContain("blurType");
  });

  it("skips multi-layer CSS shadows instead of sending invalid effects to Figma", () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.visual.shadows = ["0px 1px 2px rgba(0, 0, 0, 0.1), 0px 8px 20px rgba(0, 0, 0, 0.1)"];
    const visual = mapFrameVisual(content);
    expect(visual.effects).toEqual([]);
    expect(visual.warningCodes).toContain("SHADOW_MAPPING_FAILED");
  });

  it("centers single-text controls without growing pill frames to the full parent width", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    content.layout.primaryAlignment = "START";
    content.layout.counterAlignment = "START";
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "button", 20, 20, 220, 42, content.id),
      semantic: { tagName: "a" },
      layout: { mode: "HORIZONTAL" as const, primaryAlignment: "CENTER", counterAlignment: "CENTER", padding: { top: 0, right: 16, bottom: 0, left: 16 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 0, right: 16, bottom: 0, left: 16 }, border, radius: { topLeft: 999, topRight: 999, bottomRight: 999, bottomLeft: 999 } },
      visual: { opacity: 1, backgrounds: [{ type: "SOLID" as const, color: { r: 0.97, g: 0.98, b: 1, a: 1 } }], border, radius: { topLeft: 999, topRight: 999, bottomRight: 999, bottomLeft: 999 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: [{
        ...nodeBase("ir_000005", "TEXT", "Text", 0, 0, 44, 16, "ir_000004"),
        text: "검색",
        typography: { fontFamilies: ["Inter"], fontSize: 14, fontWeight: 700, textAlign: "CENTER" },
        sizing: { horizontal: { mode: "CONTENT" as const, confidence: 0.9, fallback: "USE_CONTENT" as const }, vertical: { mode: "CONTENT" as const, confidence: 0.9, fallback: "USE_CONTENT" as const } }
      }]
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 4;
    document.metrics.frameNodeCount = 3;
    document.metrics.textNodeCount = 1;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    const result = await createRuntime(adapter, frameAdapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("COMPLETED");
    const control = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000004")?.figmaNodeId ?? "");
    const text = control?.children.find((child) => child.type === "TEXT");
    expect(control?.width).toBeLessThan(220);
    expect(control?.layoutMode).toBe("HORIZONTAL");
    expect(control?.primaryAxisAlignItems).toBe("CENTER");
    expect(control?.counterAxisAlignItems).toBe("CENTER");
    expect(text?.textAlignHorizontal).toBe("CENTER");
    expect(text?.textAlignVertical).toBe("CENTER");
    expect(result.layoutReconstruction?.centeredControlCount).toBeGreaterThan(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("SINGLE_TEXT_CONTROL_CENTERED");
  });

  it("keeps plain inline links left aligned instead of treating every anchor as a centered control", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "삼성전자 005930", 20, 20, 120, 24, content.id),
      semantic: { tagName: "a" },
      layout: { mode: "NONE" as const, primaryAlignment: "CENTER", counterAlignment: "CENTER", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } }, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
      visual: { opacity: 1, backgrounds: [], border: { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } }, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: [textNode("ir_000005", "삼성전자 005930", 0, 0, 90, 16, "ir_000004", "left")]
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 4;
    document.metrics.frameNodeCount = 3;
    document.metrics.textNodeCount = 1;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    const result = await createRuntime(adapter, frameAdapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    const link = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000004")?.figmaNodeId ?? "");
    const text = link?.children.find((child) => child.type === "TEXT");
    expect(result.status).toBe("COMPLETED");
    expect(result.layoutReconstruction?.centeredControlCount).toBe(0);
    expect(text?.x).toBe(0);
    expect(text?.textAlignHorizontal).not.toBe("CENTER");
  });

  it("applies padding to single text boxes without centering body copy", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    const emptyBorder = { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } };
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "p", 20, 20, 300, 44, content.id),
      semantic: { tagName: "p" },
      layout: { mode: "VERTICAL" as const, primaryAlignment: "START", counterAlignment: "START", padding: { top: 5, right: 12, bottom: 5, left: 12 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 5, right: 12, bottom: 5, left: 12 }, border: emptyBorder, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 } },
      visual: { opacity: 1, backgrounds: [{ type: "SOLID" as const, color: { r: 0.97, g: 0.98, b: 0.99, a: 1 } }], border: emptyBorder, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: [textNode("ir_000005", "AI 요약 준비 중: 뉴스, 공시, 시세 근거를 함께 묶어 제공할 예정입니다.", 0, 0, 300, 34, "ir_000004", "left")]
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 4;
    document.metrics.frameNodeCount = 3;
    document.metrics.textNodeCount = 1;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    const result = await createRuntime(adapter, frameAdapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    const text = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000005")?.figmaNodeId ?? "");
    expect(result.status).toBe("COMPLETED");
    expect(text?.x).toBe(12);
    expect(text?.y).toBe(5);
    expect(text?.width).toBe(276);
    expect(text?.textAlignHorizontal).toBe("LEFT");
    expect(result.warnings.map((warning) => warning.code)).toContain("PADDED_TEXT_BOX_INSET_APPLIED");
  });

  it("reconstructs inline strong and text fragments as one horizontal text run", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    const emptyBorder = { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } };
    const whiteBackground = [{ type: "SOLID" as const, color: { r: 1, g: 1, b: 1, a: 1 } }];
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "span", 20, 20, 160, 18, content.id),
      semantic: { tagName: "span" },
      layout: { mode: "NONE" as const, primaryAlignment: "START", counterAlignment: "START", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
      visual: { opacity: 1, backgrounds: whiteBackground, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: [{
        ...nodeBase("ir_000005", "FRAME", "strong", 0, 1, 18, 14, "ir_000004"),
        semantic: { tagName: "strong" },
        layout: { mode: "NONE" as const, primaryAlignment: "START", counterAlignment: "START", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
        sizing,
        box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
        visual: { opacity: 1, backgrounds: whiteBackground, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
        clipping: { clipsContent: false, source: "FALLBACK" as const },
        children: [textNode("ir_000006", "출처", 0, 0, 18, 14, "ir_000005", "left", 700)]
      }, textNode("ir_000007", " 공시 요약", 0, 0, 90, 14, "ir_000004", "left", 400)]
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 6;
    document.metrics.frameNodeCount = 4;
    document.metrics.textNodeCount = 2;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    const result = await createRuntime(adapter, frameAdapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    const span = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000004")?.figmaNodeId ?? "");
    const strong = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000005")?.figmaNodeId ?? "");
    const plainText = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000007")?.figmaNodeId ?? "");
    expect(result.status).toBe("COMPLETED");
    expect(span?.layoutMode).toBe("HORIZONTAL");
    expect(strong?.x).toBe(0);
    expect(plainText?.x).toBeGreaterThanOrEqual(strong?.width ?? 0);
    expect(result.warnings.map((warning) => warning.code)).toContain("INLINE_TEXT_RUN_RECONSTRUCTED");
  });

  it("wraps horizontal rows when reconstructed inline labels exceed the parent width", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    const emptyBorder = { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } };
    const labels = [
      ["ir_000005", 0, 183],
      ["ir_000006", 191, 294],
      ["ir_000007", 493, 181],
      ["ir_000008", 682, 141],
      ["ir_000009", 831, 158]
    ] as const;
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "데이터 출처 메타데이터", 20, 20, 864, 25, content.id),
      layout: { mode: "HORIZONTAL" as const, primaryAlignment: "START", counterAlignment: "CENTER", gap: { primary: 8 }, padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
      visual: { opacity: 1, backgrounds: [], border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: labels.map(([id, x, width]) => ({
        ...nodeBase(id, "FRAME", "span", x, 10, width, 14, "ir_000004"),
        semantic: { tagName: "span" },
        layout: { mode: "NONE" as const, primaryAlignment: "START", counterAlignment: "START", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
        sizing,
        box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
        visual: { opacity: 1, backgrounds: [], border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
        clipping: { clipsContent: false, source: "FALLBACK" as const },
        children: []
      }))
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 8;
    document.metrics.frameNodeCount = 8;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const result = await createRuntime(adapter, frameAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    const row = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000004")?.figmaNodeId ?? "");
    const last = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000009")?.figmaNodeId ?? "");
    expect(result.status).toBe("COMPLETED");
    expect(row?.layoutWrap).toBe("WRAP");
    expect(last?.x).toBe(0);
    expect(last?.y).toBeGreaterThan(10);
    expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(row?.width ?? 0);
    expect(result.warnings.map((warning) => warning.code)).toContain("OVERFLOWING_ROW_WRAPPED");
  });

  it("preserves measured vertical offsets when child controls grow", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "VERTICAL";
    const emptyBorder = { ...border, width: { top: 0, right: 0, bottom: 0, left: 0 } };
    content.children = [{
      ...nodeBase("ir_000004", "FRAME", "div", 20, 20, 419, 101, content.id),
      layout: { mode: "VERTICAL" as const, primaryAlignment: "START", counterAlignment: "START", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
      sizing,
      box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
      visual: { opacity: 1, backgrounds: [], border: emptyBorder, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" as const },
      clipping: { clipsContent: false, source: "FALLBACK" as const },
      children: [
        controlLink("ir_000005", "ir_000006", 0, 0, 419, 42),
        controlLink("ir_000007", "ir_000008", 0, 50, 419, 42)
      ]
    }] as DesignIrNode[];
    document.metrics.totalNodeCount = 7;
    document.metrics.frameNodeCount = 5;
    document.metrics.textNodeCount = 2;
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    const result = await createRuntime(adapter, frameAdapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    const first = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000005")?.figmaNodeId ?? "");
    const second = adapter.getNodeById(result.mappings.find((item) => item.irNodeId === "ir_000007")?.figmaNodeId ?? "");
    expect(result.status).toBe("COMPLETED");
    expect(first?.height).toBe(42);
    expect(second?.height).toBe(42);
    expect(second?.y).toBeGreaterThanOrEqual((first?.y ?? 0) + (first?.height ?? 0) + 8);
  });

  it("uses freeform fallback for grid and replaces child mapping failures with placeholders", async () => {
    const document = createDocument();
    const content = document.root.children[0] as Extract<DesignIrNode, { nodeType: "FRAME" }>;
    content.layout.mode = "GRID_REFERENCE";
    const adapter = new FakeFigmaRendererAdapter();
    const frameAdapter = new FakeFigmaFrameAdapter(adapter);
    frameAdapter.failLayout = true;
    const result = await createRuntime(adapter, frameAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } });
    expect(result.status).toBe("COMPLETED");
    expect(result.metrics.rollbackNodeCount).toBe(0);
    expect(result.metrics.placeholderNodeCount).toBeGreaterThan(0);
    expect(adapter.nodes.size).toBeGreaterThan(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("NODE_PLACEHOLDER_CREATED");
  });
});

function textNode(id: string, text: string, x: number, y: number, width: number, height: number, parentId: string, textAlign: string, fontWeight = 400): DesignIrNode {
  return {
    ...nodeBase(id, "TEXT", "Text", x, y, width, height, parentId),
    text,
    typography: { fontFamilies: ["Inter"], fontSize: 14, fontWeight, lineHeight: 14, textAlign },
    sizing: { horizontal: { mode: "CONTENT" as const, confidence: 0.9, fallback: "USE_CONTENT" as const }, vertical: { mode: "CONTENT" as const, confidence: 0.9, fallback: "USE_CONTENT" as const } }
  } as DesignIrNode;
}

function controlLink(id: string, textId: string, x: number, y: number, width: number, height: number): DesignIrNode {
  const emptyBorder = { ...border, width: { top: 1, right: 1, bottom: 1, left: 1 } };
  return {
    ...nodeBase(id, "FRAME", "a", x, y, width, height, "ir_000004"),
    semantic: { tagName: "a" },
    layout: { mode: "HORIZONTAL" as const, primaryAlignment: "CENTER", counterAlignment: "CENTER", padding: { top: 0, right: 16, bottom: 0, left: 16 }, positionedChildIds: [], confidence: 0.9, fallbackApplied: false },
    sizing,
    box: { padding: { top: 0, right: 16, bottom: 0, left: 16 }, border: emptyBorder, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 } },
    visual: { opacity: 1, backgrounds: [{ type: "SOLID" as const, color: { r: 0.94, g: 0.97, b: 1, a: 1 } }], border: emptyBorder, radius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 }, shadows: [], overflow: "VISIBLE" as const },
    clipping: { clipsContent: false, source: "FALLBACK" as const },
    children: [textNode(textId, "일정 보기", 0, 0, width, 42, id, "center", 700)]
  } as DesignIrNode;
}
