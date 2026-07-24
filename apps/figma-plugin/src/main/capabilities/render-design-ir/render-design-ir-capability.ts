import { parseDesignIr, validateDesignIrSemantics, type DesignIrDocument } from "@aio/design-ir";
import type { CapabilityFailure, CapabilityResult, CapabilityWarning } from "@aio/shared-contracts";
import type { PluginCapability } from "../contracts";
import type { RendererRuntime } from "../../renderer/runtime/renderer-runtime";
import { renderDesignIrInputSchema, type RenderDesignIrInput, type ValidatedRenderDesignIrInput } from "./input-schema";
import { renderDesignIrMetadata } from "./metadata";

function failure(code: string, message: string): CapabilityFailure { return { code, message }; }

export function createRenderDesignIrCapability(renderer: RendererRuntime): PluginCapability<RenderDesignIrInput, ValidatedRenderDesignIrInput> {
  return {
    metadata: renderDesignIrMetadata,
    inputSchema: renderDesignIrInputSchema,
    async validate(_context, input) {
      try {
        const document = parseDesignIr(input.document);
        validateDesignIrSemantics(document);
        return { valid: true, input: { document, options: { placement: input.options?.placement ?? "CURRENT_VIEWPORT", placeholderPolicy: input.options?.placeholderPolicy ?? "CREATE", rollbackOnError: input.options?.rollbackOnError ?? true, selectRootOnComplete: input.options?.selectRootOnComplete ?? true } }, warnings: [] };
      } catch (error) {
        return { valid: false, failures: [failure("RENDER_PREFLIGHT_FAILED", error instanceof Error ? error.message : "Design IR preflight failed.")], warnings: [] };
      }
    },
    async execute(context, input) {
      const result = await renderer.render({ document: input.document as DesignIrDocument, options: input.options }, context.signal, (progress) => context.reportProgress({ phase: progress.stage, progress: progress.totalNodes === 0 ? 1 : progress.completedNodes / progress.totalNodes, message: progress.message }));
      const warnings: CapabilityWarning[] = result.warnings.map((warning) => ({ code: warning.code, message: warning.message, severity: "MEDIUM", ...(warning.irNodeId ? { nodeId: warning.irNodeId } : {}), recoverable: true }));
      const failures: CapabilityFailure[] = result.failures.map((failureItem) => ({ code: failureItem.code, message: failureItem.message, ...(failureItem.irNodeId ? { nodeId: failureItem.irNodeId } : {}) }));
      return {
        capabilityId: context.capabilityId,
        operationId: context.operationId,
        success: result.status === "COMPLETED" || result.status === "PARTIAL",
        processedCount: result.metrics.requestedNodeCount,
        createdCount: result.metrics.createdNodeCount,
        changedCount: 0,
        skippedCount: result.metrics.skippedNodeCount,
        failedCount: failures.length,
        warnings,
        failures,
        startedAt: context.now(),
        completedAt: context.now()
      } satisfies CapabilityResult;
    }
  };
}
