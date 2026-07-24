import { describe, expect, it } from "vitest";
import { createEmptySelectionSummary } from "@aio/shared-contracts";
import { createRenderDesignIrCapability } from "../src/main/capabilities/render-design-ir/render-design-ir-capability.js";
import { FakeFigmaRendererAdapter } from "../src/main/renderer/fake-adapter.js";
import { documentNodeFactory } from "../src/main/renderer/factories/document-node-factory.js";
import { frameNodeFactory } from "../src/main/renderer/factories/frame-node-factory.js";
import { imagePlaceholderFactory } from "../src/main/renderer/factories/image-placeholder-factory.js";
import { textPlaceholderFactory } from "../src/main/renderer/factories/text-placeholder-factory.js";
import { unsupportedNodeFactory } from "../src/main/renderer/factories/unsupported-node-factory.js";
import { vectorPlaceholderFactory } from "../src/main/renderer/factories/vector-placeholder-factory.js";
import { createRendererRegistry } from "../src/main/renderer/runtime/node-factory.js";
import { createRendererRuntime } from "../src/main/renderer/runtime/renderer-runtime.js";
import { createDocumentForRendererTest } from "./renderer-test-fixture.js";

describe("render-design-ir capability", () => {
  it("validates and renders a Design IR through the capability boundary", async () => {
    const registry = createRendererRegistry();
    for (const factory of [documentNodeFactory, frameNodeFactory, textPlaceholderFactory, imagePlaceholderFactory, vectorPlaceholderFactory, unsupportedNodeFactory]) registry.register(factory);
    const capability = createRenderDesignIrCapability(createRendererRuntime(registry, new FakeFigmaRendererAdapter()));
    const progress: string[] = [];
    const context = { operationId: "op_render" as const, capabilityId: "render-design-ir", selection: createEmptySelectionSummary("page_test", 1), signal: new AbortController().signal, reportProgress: (event: { phase: string }) => { progress.push(event.phase); }, now: () => new Date().toISOString() };
    const input = { document: createDocumentForRendererTest(), options: { placement: "PAGE_ORIGIN", placeholderPolicy: "CREATE", rollbackOnError: true, selectRootOnComplete: false } } as const;
    const validation = await capability.validate(context, input);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const result = await capability.execute(context, validation.input);
    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(3);
    expect(progress).toContain("CREATING_NODES");
  });
});
