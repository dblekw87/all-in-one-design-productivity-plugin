import { describe, expect, it, vi } from "vitest";
import { createOperationId } from "@aio/shared-contracts";
import { createCapabilityRegistry } from "../src/main/capabilities/capability-registry";
import { createCapabilityRunner } from "../src/main/capabilities/capability-runner";
import { createOperationRegistry } from "../src/main/capabilities/operation-registry";
import { websiteImportCapability } from "../src/main/capabilities/website-import/website-import-capability";
import { websiteImportInputSchema } from "../src/main/capabilities/website-import/input-schema";
import { createWebsiteImportCapability } from "../src/main/capabilities/website-import/website-import-capability";
import { createDocumentForRendererTest } from "./renderer-test-fixture";

function createWebsiteImportRunner() {
  const capabilityRegistry = createCapabilityRegistry();
  capabilityRegistry.register(websiteImportCapability);
  return createCapabilityRunner({
    capabilityRegistry,
    operationRegistry: createOperationRegistry(),
    getSelection() {
      return {
        selectionCount: 0,
        nodeTypes: [],
        textNodeCount: 0,
        frameNodeCount: 0,
        componentNodeCount: 0,
        instanceNodeCount: 0,
        pageId: "page-1",
        version: 0,
        nodes: []
      };
    },
    createProgressReporter() {
      return { report: vi.fn() };
    }
  });
}

describe("Website Import capability", () => {
  it("accepts valid HTTPS URLs", () => {
    expect(websiteImportInputSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
    expect(websiteImportInputSchema.safeParse({ url: "https://invest-community-beta.vercel.app/?feed=domestic" }).success).toBe(true);
  });

  it("rejects malformed URLs and empty input with paths", () => {
    const malformed = websiteImportInputSchema.safeParse({ url: "not-a-url" });
    const empty = websiteImportInputSchema.safeParse({});

    expect(malformed.success).toBe(false);
    if (!malformed.success) {
      expect(malformed.error.issues[0]?.path).toEqual(["url"]);
    }
    expect(empty.success).toBe(false);
  });

  it("accepts localhost HTTP URLs for development and rejects public HTTP URLs", () => {
    expect(websiteImportInputSchema.safeParse({ url: "http://localhost:4000/fixture" }).success).toBe(true);
    expect(websiteImportInputSchema.safeParse({ url: "http://example.com" }).success).toBe(false);
  });

  it("rejects unexpected fields", () => {
    expect(
      websiteImportInputSchema.safeParse({ url: "https://example.com", extra: true }).success
    ).toBe(false);
  });

  it("returns NOT_IMPLEMENTED without network access", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await createWebsiteImportRunner().run({
      capabilityId: "website-import",
      operationId: createOperationId(),
      input: { url: "https://example.com" }
    });

    expect(result.failures[0]?.code).toBe("NOT_IMPLEMENTED");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not execute invalid inputs", async () => {
    const result = await createWebsiteImportRunner().run({
      capabilityId: "website-import",
      operationId: createOperationId(),
      input: { url: "" }
    });

    expect(result.failures[0]?.code).toBe("CAPABILITY_INPUT_INVALID");
  });

  it("passes an analyzed Design IR and transfer context to the renderer", async () => {
    const document = createDocumentForRendererTest();
    const assetTransfer = {
      session: {
        sessionId: "imp_test",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        assetCount: 0,
        totalByteLength: 0,
        accessToken: "x".repeat(32)
      },
      manifest: {
        manifestVersion: "1.0" as const,
        session: { sessionId: "imp_test", expiresAt: new Date(Date.now() + 60_000).toISOString() },
        assets: [],
        metrics: { assetCount: 0, totalByteLength: 0 }
      }
    };
    const analyzeClient = {
      analyze: vi.fn(async () => ({
        contractVersion: "1.0" as const,
        requestId: "req_test" as const,
        status: "TRANSFER_SESSION_READY" as const,
        target: { normalizedUrl: "https://example.com/" },
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        document,
        assetTransfer,
        assets: [],
        warnings: [],
        metrics: { processingTimeMs: 1, domNodeCount: 3, designNodeCount: 3, assetCount: 0 }
      }))
    };
    const renderer = {
      render: vi.fn(async () => ({
        status: "COMPLETED" as const,
        rootFigmaNodeId: "1:1",
        mappings: [],
        metrics: { requestedNodeCount: 3, createdNodeCount: 3, skippedNodeCount: 0, placeholderNodeCount: 1, rollbackNodeCount: 0, durationMs: 2 },
        warnings: [],
        failures: []
      }))
    };
    const capability = createWebsiteImportCapability(renderer, { analyzeClient });
    const result = await capability.execute(
      {
        operationId: createOperationId(),
        capabilityId: "website-import",
        selection: { selectionCount: 0, nodeTypes: [], textNodeCount: 0, frameNodeCount: 0, componentNodeCount: 0, instanceNodeCount: 0, pageId: "page-1", version: 0, nodes: [] },
        signal: new AbortController().signal,
        reportProgress: vi.fn(),
        now: () => new Date().toISOString()
      },
      { url: "https://example.com" }
    );

    expect(result.success).toBe(true);
    expect(analyzeClient.analyze).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ assetTransfer }), expect.anything(), expect.anything());
  });
});
