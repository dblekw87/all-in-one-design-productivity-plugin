import { describe, expect, it, vi } from "vitest";
import { createOperationId } from "@aio/shared-contracts";
import { createCapabilityRegistry } from "../src/main/capabilities/capability-registry";
import { createCapabilityRunner } from "../src/main/capabilities/capability-runner";
import { createOperationRegistry } from "../src/main/capabilities/operation-registry";
import { websiteImportCapability } from "../src/main/capabilities/website-import/website-import-capability";
import { websiteImportInputSchema } from "../src/main/capabilities/website-import/input-schema";

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

describe("Website Import placeholder capability", () => {
  it("accepts valid HTTPS URLs", () => {
    expect(websiteImportInputSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
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

  it("rejects HTTP URLs in plugin-level placeholder validation", () => {
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
});
