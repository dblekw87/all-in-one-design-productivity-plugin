import { captureSnapshotSchema, type CapabilityResult, type CapabilityWarning, type CaptureSnapshot } from "@aio/shared-contracts";
import type { PluginCapability } from "../contracts";
import type { RendererRuntime } from "../../renderer/runtime/renderer-runtime";
import { browserSnapshotImportInputSchema, type BrowserSnapshotImportInput } from "./input-schema";
import { browserSnapshotImportMetadata } from "./metadata";
import { buildDesignIrFromBrowserSnapshot } from "./snapshot-to-design-ir";

export interface ValidatedBrowserSnapshotImportInput {
  snapshot: CaptureSnapshot;
  options: {
    includeScreenshotReference: boolean;
    includeEditableLayers: boolean;
  };
}

export function createBrowserSnapshotImportCapability(renderer?: RendererRuntime): PluginCapability<BrowserSnapshotImportInput, ValidatedBrowserSnapshotImportInput> {
  return {
    metadata: browserSnapshotImportMetadata,
    inputSchema: browserSnapshotImportInputSchema,
    async validate(_context, input) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(input.snapshotJson);
    } catch {
      return {
        valid: false,
        warnings: [],
        failures: [{ code: "SNAPSHOT_JSON_INVALID", message: "Snapshot JSON could not be parsed." }]
      };
    }

    const parsedSnapshot = captureSnapshotSchema.safeParse(parsedJson);
    if (!parsedSnapshot.success) {
      return {
        valid: false,
        warnings: [],
        failures: [{
          code: "CAPTURE_SNAPSHOT_INVALID",
          message: parsedSnapshot.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ").slice(0, 500)
        }]
      };
    }

    const warnings: CapabilityWarning[] = parsedSnapshot.data.capture.mode === "BROWSER_TAB"
      ? []
      : [{ code: "SNAPSHOT_MODE_UNEXPECTED", message: `Expected BROWSER_TAB snapshot, received ${parsedSnapshot.data.capture.mode}.`, severity: "MEDIUM", recoverable: true }];

    return {
      valid: true,
      input: {
        snapshot: parsedSnapshot.data as CaptureSnapshot,
        options: {
          includeScreenshotReference: input.options?.includeScreenshotReference ?? true,
          includeEditableLayers: input.options?.includeEditableLayers ?? true
        }
      },
      warnings
    };
    },
    async execute(context, input) {
      if (!renderer) return failureResult(context, input.snapshot, "NOT_IMPLEMENTED", "Browser Snapshot Import renderer is not configured.");
      context.reportProgress({ phase: "CONVERTING", progress: 0.15, message: "Converting Snapshot JSON to Design IR." });
      const document = buildDesignIrFromBrowserSnapshot(input.snapshot, input.options);
      context.reportProgress({ phase: "RENDERING", progress: 0.35, message: "Rendering browser snapshot layers to Figma." });
      const rendered = await renderer.render(
        {
          document,
          options: {
            placement: "CURRENT_VIEWPORT",
            placeholderPolicy: "CREATE",
            rollbackOnError: true,
            selectRootOnComplete: true,
            assetFailurePolicy: "PLACEHOLDER"
          }
        },
        context.signal,
        (progress) => context.reportProgress({
          phase: progress.stage,
          progress: Math.min(1, 0.35 + (progress.totalNodes === 0 ? 0.65 : (progress.completedNodes / progress.totalNodes) * 0.65)),
          message: progress.message
        })
      );
      const warnings: CapabilityWarning[] = [
        ...input.snapshot.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          severity: warning.severity === "ERROR" ? "HIGH" : warning.severity === "WARNING" ? "MEDIUM" : "LOW",
          ...(warning.sourceNodeId ? { nodeId: warning.sourceNodeId } : {}),
          recoverable: true
        } satisfies CapabilityWarning)),
        ...rendered.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          severity: "MEDIUM" as const,
          ...(warning.irNodeId ? { nodeId: warning.irNodeId } : {}),
          recoverable: true
        }))
      ];
      const failures = rendered.failures.map((failure) => ({ code: failure.code, message: failure.message, ...(failure.irNodeId ? { nodeId: failure.irNodeId } : {}) }));
      context.reportProgress({ phase: rendered.status === "COMPLETED" ? "COMPLETED" : rendered.status, progress: 1, message: rendered.status === "COMPLETED" ? "Browser snapshot import completed." : "Browser snapshot import did not complete." });
      return {
        capabilityId: context.capabilityId,
        operationId: context.operationId,
        success: rendered.status === "COMPLETED" || rendered.status === "PARTIAL",
        processedCount: rendered.metrics.requestedNodeCount,
        createdCount: rendered.metrics.createdNodeCount,
        changedCount: 0,
        skippedCount: rendered.metrics.skippedNodeCount,
        failedCount: failures.length,
        warnings,
        failures,
        startedAt: context.now(),
        completedAt: context.now()
      } satisfies CapabilityResult;
    }
  };
}

export const browserSnapshotImportCapability = createBrowserSnapshotImportCapability();

function failureResult(context: { capabilityId: string; operationId: string; now(): string }, snapshot: CaptureSnapshot, code: string, message: string): CapabilityResult {
  const timestamp = context.now();
  return {
    capabilityId: context.capabilityId,
    operationId: context.operationId,
    success: false,
    processedCount: snapshot.metrics.domCount,
    createdCount: 0,
    changedCount: 0,
    skippedCount: snapshot.metrics.domCount,
    failedCount: 1,
    warnings: [],
    failures: [{ code, message }],
    startedAt: timestamp,
    completedAt: timestamp
  };
}
