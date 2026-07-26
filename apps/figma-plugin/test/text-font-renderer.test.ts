import { describe, expect, it } from "vitest";
import { createDocumentForRendererTest } from "./renderer-test-fixture";
import { FakeFigmaRendererAdapter } from "../src/main/renderer/fake-adapter.js";
import { FakeFigmaImageAdapter } from "../src/main/renderer/fake-image-adapter.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { textNodeFactory } from "../src/main/renderer/factories/text-node-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";
import { vectorNodeFactory } from "../src/main/renderer/factories/vector-node-factory.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";
import { FakeFigmaTextAdapter } from "../src/main/renderer/text/adapter/fake-figma-font-adapter.js";
import { parseFontFamilyList } from "../src/main/renderer/text/font/parse-font-family-list.js";
import { createFontResolver } from "../src/main/renderer/text/font/resolve-font.js";
import { FontLoadCache } from "../src/main/renderer/text/font/font-load-cache.js";

function createRuntime(adapter: FakeFigmaRendererAdapter, textAdapter: FakeFigmaTextAdapter) {
  const registry = createRendererRegistry();
  registry.register(documentNodeFactory);
  registry.register(frameNodeFactory);
  registry.register(textNodeFactory);
  registry.register(imagePlaceholderFactory);
  registry.register(vectorNodeFactory);
  registry.register(unsupportedNodeFactory);
  return createRendererRuntime(registry, adapter, {}, Date.now, {
    client: { async fetchAsset() { throw new Error("unused"); }, async deleteSession() { /* unused */ } },
    imageAdapter: new FakeFigmaImageAdapter(),
    textAdapter,
  });
}

describe("text font renderer", () => {
  it("parses quoted, generic, duplicate, and Next font families", () => {
    const parsed = parseFontFamilyList("\"Inter\", \"Pretendard\", Arial, sans-serif, Arial, __Noto_Sans_KR_xyz");
    expect(parsed.map((item) => item.displayName)).toEqual(["Inter", "Pretendard", "Arial", "sans-serif", "Noto Sans KR"]);
    expect(parsed[3]?.generic).toBe(true);
    expect(parsed[4]?.nextFontDerived).toBe(true);
  });

  it("resolves exact, bold italic, generic, and first available fallbacks", async () => {
    const adapter = new FakeFigmaTextAdapter(() => { throw new Error("unused"); });
    adapter.availableFonts = [
      { family: "Inter", style: "Regular" },
      { family: "Inter", style: "Bold Italic" },
      { family: "Roboto Mono", style: "Regular" },
    ];
    const resolver = createFontResolver(adapter);
    await expect(resolver.resolve({ fontFamilies: ["Inter"], fontWeight: 700, fontStyle: "italic" })).resolves.toMatchObject({ family: "Inter", style: "Bold Italic", source: "EXACT" });
    await expect(resolver.resolve({ fontFamilies: ["monospace"], fontWeight: 400 })).resolves.toMatchObject({ family: "Roboto Mono", source: "SYSTEM_FALLBACK" });
    adapter.availableFonts = [{ family: "Only Font", style: "Book" }];
    await expect(createFontResolver(adapter).resolve({ fontFamilies: ["Missing"] })).resolves.toMatchObject({ family: "Only Font", source: "FIRST_AVAILABLE" });
  });

  it("loads the same font once and clears failed loads", async () => {
    const adapter = new FakeFigmaTextAdapter(() => { throw new Error("unused"); });
    const cache = new FontLoadCache(adapter);
    await Promise.all([cache.load({ family: "Inter", style: "Regular" }), cache.load({ family: "Inter", style: "Regular" })]);
    expect(adapter.loadCalls).toHaveLength(1);
    adapter.failLoads.add("Inter::Bold");
    await expect(cache.load({ family: "Inter", style: "Bold" })).rejects.toThrow();
    adapter.failLoads.clear();
    await cache.load({ family: "Inter", style: "Bold" });
    expect(adapter.loadCalls.filter((font) => font.style === "Bold")).toHaveLength(2);
    cache.clear();
    await cache.load({ family: "Inter", style: "Regular" });
    expect(adapter.loadCalls.filter((font) => font.style === "Regular")).toHaveLength(2);
  });

  it("creates real text nodes with loaded fonts, typography, geometry, mapping, and plugin data", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    textAdapter.availableFonts = [{ family: "Inter", style: "Regular" }];
    const document = createDocumentForRendererTest();
    const progress: string[] = [];
    const result = await createRuntime(adapter, textAdapter).render({ document, options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } }, undefined, (event) => progress.push(event.stage));
    const textMapping = result.mappings.find((mapping) => mapping.irNodeId === "ir_000003");
    const textNode = textMapping ? adapter.getNodeById(textMapping.figmaNodeId) : undefined;
    const style = textMapping ? textAdapter.appliedStyles.get(textMapping.figmaNodeId) : undefined;
    expect(result.status).toBe("COMPLETED");
    expect(result.metrics.placeholderNodeCount).toBe(0);
    expect(textNode?.type).toBe("TEXT");
    expect(style).toMatchObject({ characters: "Hello", fontName: { family: "Inter", style: "Regular" }, fontSize: 16, textAlignHorizontal: "LEFT" });
    expect(textNode?.width).toBe(384);
    expect((textNode as { textAutoResize?: string } | undefined)?.textAutoResize).toBe("HEIGHT");
    expect(pluginData(textNode).get("aio:renderType")).toBe("TEXT");
    expect(pluginData(textNode).get("aio:fontSource")).toBe("EXACT");
    expect(progress).toEqual(expect.arrayContaining(["RESOLVING_FONTS", "LOADING_FONTS", "CREATING_TEXT_NODES", "APPLYING_TYPOGRAPHY"]));
    expect(textAdapter.loadCalls).toHaveLength(1);
  });

  it("falls back to a placeholder when all fonts fail under placeholder policy", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const textAdapter = new FakeFigmaTextAdapter(() => adapter.createText());
    textAdapter.availableFonts = [];
    const result = await createRuntime(adapter, textAdapter).render({ document: createDocumentForRendererTest(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false, textFailurePolicy: "PLACEHOLDER" } });
    const textMapping = result.mappings.find((mapping) => mapping.irNodeId === "ir_000003");
    const node = textMapping ? adapter.getNodeById(textMapping.figmaNodeId) : undefined;
    expect(result.status).toBe("COMPLETED");
    expect(result.metrics.placeholderNodeCount).toBe(1);
    expect(node?.type).toBe("FRAME");
    expect(pluginData(node).get("aio:placeholderType")).toBe("TEXT");
    expect(result.warnings.some((warning) => warning.code === "FONT_RESOLUTION_FAILED")).toBe(true);
  });

  it("rolls back generated text nodes when cancelled after text creation", async () => {
    const adapter = new FakeFigmaRendererAdapter();
    const textAdapter = new FakeFigmaTextAdapter(() => {
      const text = adapter.createText();
      controller.abort();
      return text;
    });
    const controller = new AbortController();
    const result = await createRuntime(adapter, textAdapter).render({ document: createDocumentForRendererTest(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } }, controller.signal);
    expect(result.status).toBe("CANCELLED");
    expect(result.metrics.rollbackNodeCount).toBeGreaterThan(0);
    expect([...adapter.nodes.values()].some((node) => node.type === "TEXT")).toBe(false);
  });
});

function pluginData(node: unknown): Map<string, string> {
  return (node as { pluginData?: Map<string, string> } | undefined)?.pluginData ?? new Map<string, string>();
}
