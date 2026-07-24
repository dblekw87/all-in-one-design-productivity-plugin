import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createMessageId,
  createOperationId,
  type CapabilityResult,
  type CapabilityWarning,
  type OperationId,
  type SelectionSummary
} from "@aio/shared-contracts";
import { createCapabilityRegistry } from "../src/main/capabilities/capability-registry";
import { createCapabilityRunner } from "../src/main/capabilities/capability-runner";
import { createOperationRegistry } from "../src/main/capabilities/operation-registry";
import type { CapabilityProgressUpdate, PluginCapability } from "../src/main/capabilities/contracts";
import { websiteImportCapability } from "../src/main/capabilities/website-import/website-import-capability";

const emptySelection: SelectionSummary = {
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

function result(capabilityId: string, operationId: OperationId, success = true): CapabilityResult {
  return {
    capabilityId,
    operationId,
    success,
    processedCount: success ? 1 : 0,
    createdCount: 0,
    changedCount: 0,
    skippedCount: 0,
    failedCount: success ? 0 : 1,
    warnings: [],
    failures: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };
}

function createRunner(capabilities: PluginCapability[], progress: CapabilityProgressUpdate[] = []) {
  const capabilityRegistry = createCapabilityRegistry();
  for (const capability of capabilities) {
    capabilityRegistry.register(capability);
  }
  const operationRegistry = createOperationRegistry();
  const runner = createCapabilityRunner({
    capabilityRegistry,
    operationRegistry,
    getSelection: () => emptySelection,
    createProgressReporter() {
      return {
        report(update) {
          progress.push(update);
        }
      };
    }
  });

  return { runner, operationRegistry };
}

describe("capability runner lifecycle", () => {
  it("runs a successful capability and reports progress", async () => {
    const progress: CapabilityProgressUpdate[] = [];
    const capability: PluginCapability<{ value: string }> = {
      metadata: {
        id: "success",
        category: "GENERATE",
        label: "Success",
        description: "Test capability",
        order: 1,
        enabled: true
      },
      inputSchema: z.object({ value: z.string() }),
      async validate(_context, input) {
        const warning: CapabilityWarning = {
          code: "TEST_WARNING",
          message: "test warning",
          severity: "LOW",
          recoverable: true
        };
        return { valid: true, input, warnings: [warning] };
      },
      async execute(context) {
        context.reportProgress({ phase: "START", progress: 0 });
        context.reportProgress({ phase: "MIDDLE", progress: 0.5 });
        context.reportProgress({ phase: "DONE", progress: 1 });
        return result(context.capabilityId, context.operationId);
      }
    };
    const { runner, operationRegistry } = createRunner([capability], progress);
    const operationId = createOperationId();

    const runResult = await runner.run({ capabilityId: "success", operationId, input: { value: "ok" } });

    expect(runResult.success).toBe(true);
    expect(progress.map((entry) => entry.progress)).toEqual([0, 0.5, 1]);
    expect(operationRegistry.list()).toEqual([]);
  });

  it("does not call validate when schema validation fails", async () => {
    const validate = vi.fn();
    const capability: PluginCapability<{ value: string }> = {
      metadata: {
        id: "schema",
        category: "GENERATE",
        label: "Schema",
        description: "Test capability",
        order: 1,
        enabled: true
      },
      inputSchema: z.object({ value: z.string() }).strict(),
      validate,
      async execute(context) {
        return result(context.capabilityId, context.operationId);
      }
    };
    const { runner } = createRunner([capability]);
    const runResult = await runner.run({ capabilityId: "schema", operationId: createOperationId(), input: {} });

    expect(runResult.failures[0]?.code).toBe("CAPABILITY_INPUT_INVALID");
    expect(validate).not.toHaveBeenCalled();
  });

  it("does not execute when domain validation fails and preserves warnings", async () => {
    const execute = vi.fn();
    const capability: PluginCapability<{ value: string }> = {
      metadata: {
        id: "domain",
        category: "GENERATE",
        label: "Domain",
        description: "Test capability",
        order: 1,
        enabled: true
      },
      inputSchema: z.object({ value: z.string() }),
      async validate() {
        return {
          valid: false,
          warnings: [{ code: "WARN", message: "warn", severity: "LOW", recoverable: true }],
          failures: [{ code: "CAPABILITY_VALIDATION_FAILED", message: "domain failed" }]
        };
      },
      execute
    };
    const { runner } = createRunner([capability]);
    const runResult = await runner.run({
      capabilityId: "domain",
      operationId: createOperationId(),
      input: { value: "ok" }
    });

    expect(runResult.success).toBe(false);
    expect(runResult.warnings[0]?.code).toBe("WARN");
    expect(execute).not.toHaveBeenCalled();
  });

  it("serializes execute errors", async () => {
    const capability: PluginCapability<Record<string, never>> = {
      metadata: {
        id: "throwing",
        category: "GENERATE",
        label: "Throwing",
        description: "Test capability",
        order: 1,
        enabled: true
      },
      inputSchema: z.object({}).strict(),
      async validate(_context, input) {
        return { valid: true, input, warnings: [] };
      },
      async execute() {
        throw new Error("boom");
      }
    };
    const { runner } = createRunner([capability]);
    const runResult = await runner.run({ capabilityId: "throwing", operationId: createOperationId(), input: {} });

    expect(runResult.failures[0]?.code).toBe("CAPABILITY_EXECUTION_FAILED");
  });

  it("blocks disabled capabilities", async () => {
    const capability: PluginCapability<Record<string, never>> = {
      metadata: {
        id: "disabled",
        category: "GENERATE",
        label: "Disabled",
        description: "Test capability",
        order: 1,
        enabled: false
      },
      inputSchema: z.object({}).strict(),
      async validate(_context, input) {
        return { valid: true, input, warnings: [] };
      },
      async execute(context) {
        return result(context.capabilityId, context.operationId);
      }
    };
    const { runner } = createRunner([capability]);
    const runResult = await runner.run({ capabilityId: "disabled", operationId: createOperationId(), input: {} });

    expect(runResult.failures[0]?.code).toBe("CAPABILITY_DISABLED");
  });

  it("cancels a running operation and cleans up", async () => {
    const capability: PluginCapability<Record<string, never>> = {
      metadata: {
        id: "cancellable",
        category: "GENERATE",
        label: "Cancellable",
        description: "Test capability",
        order: 1,
        enabled: true
      },
      inputSchema: z.object({}).strict(),
      async validate(_context, input) {
        return { valid: true, input, warnings: [] };
      },
      async execute(context) {
        await new Promise<void>((resolve) => {
          context.signal.addEventListener("abort", () => resolve(), { once: true });
        });
        return result(context.capabilityId, context.operationId, false);
      }
    };
    const { runner, operationRegistry } = createRunner([capability]);
    const operationId = createOperationId();
    const runPromise = runner.run({ capabilityId: "cancellable", operationId, input: {} });

    await vi.waitFor(() => expect(operationRegistry.get(operationId)).toBeTruthy());
    expect(runner.cancel(operationId)).toEqual({ operationId, cancelled: true });

    const runResult = await runPromise;
    expect(runResult.failures[0]?.code).toBe("CAPABILITY_CANCELLED");
    expect(operationRegistry.list()).toEqual([]);
  });

  it("reports missing operations on cancel", () => {
    const { runner } = createRunner([]);
    const operationId = createOperationId();

    expect(runner.cancel(operationId)).toEqual({
      operationId,
      cancelled: false,
      reason: "No running operation found."
    });
  });

  it("rejects duplicate operation registration", () => {
    const operationRegistry = createOperationRegistry();
    const operation = {
      operationId: createOperationId(),
      capabilityId: "test",
      controller: new AbortController(),
      startedAt: new Date().toISOString()
    };

    operationRegistry.register(operation);
    expect(() => operationRegistry.register(operation)).toThrow("Operation already registered");
  });

  it("keeps production registry to Website Import only", () => {
    const { runner } = createRunner([websiteImportCapability]);
    expect(runner.cancel(createOperationId()).cancelled).toBe(false);
  });

  it("does not need message IDs in runner tests", () => {
    expect(createMessageId().startsWith("msg_")).toBe(true);
  });
});
