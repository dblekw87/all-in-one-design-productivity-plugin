import type { DesignIrDocument } from "@aio/design-ir";
import type { AssetTransferSessionResponse, CapabilityFailure, CapabilityResult, CapabilityWarning } from "@aio/shared-contracts";
import type { RendererRuntime } from "../../renderer/runtime/renderer-runtime";
import type { PluginCapability } from "../contracts";
import { websiteImportInputSchema, type WebsiteImportInput } from "./input-schema";
import { createWebsiteAnalyzeClient, type WebsiteAnalyzeClient } from "./analyze-client";
import { websiteImportMetadata } from "./metadata";

export interface WebsiteImportCapabilityOptions {
  parserServerUrl?: string;
  analyzeClient?: WebsiteAnalyzeClient;
}

export function createWebsiteImportCapability(
  renderer?: RendererRuntime,
  options: WebsiteImportCapabilityOptions = {}
): PluginCapability<WebsiteImportInput> {
  const analyzeClient = options.analyzeClient ?? (options.parserServerUrl ? createWebsiteAnalyzeClient(options.parserServerUrl) : undefined);

  return {
    metadata: websiteImportMetadata,
    inputSchema: websiteImportInputSchema,
    async validate(_context, input) {
      return { valid: true, input, warnings: [] };
    },
    async execute(context, input) {
      if (!renderer || !analyzeClient) return failureResult(context, "NOT_IMPLEMENTED", "Website Import runtime is not configured.");

      context.reportProgress({ phase: "ANALYZING", progress: 0.05, message: "Analyzing website structure." });
      let response;
      try {
        response = await analyzeClient.analyze(input.url, context.signal);
      } catch (error) {
        if (context.signal.aborted) throw error;
        const code = toSafeErrorCode(error, "ANALYZE_FETCH_FAILED");
        const detail = toSafeErrorDetail(error);
        return failureResult(context, code, detail ? `Website analysis failed: ${detail}` : "Website analysis failed.");
      }

      if (context.signal.aborted) throw new Error("CAPABILITY_CANCELLED");
      if (!response.document) {
        const warningCode = response.warnings[0]?.code;
        const warningMessage = response.warnings[0]?.message;
        const detail = warningCode ? ` ${warningCode}${warningMessage ? `: ${warningMessage}` : ""}` : "";
        return failureResult(context, "DESIGN_IR_NOT_AVAILABLE", `The analyzer did not return a Design IR document.${detail}`);
      }

      context.reportProgress({ phase: "RENDERING", progress: 0.35, message: "Rendering analyzed layers to Figma." });
      const rendered = await renderer.render(
        {
          document: response.document as DesignIrDocument,
          ...(response.assetTransfer ? { assetTransfer: response.assetTransfer as AssetTransferSessionResponse } : {}),
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
        ...response.warnings.map((warning) => ({ code: warning.code, message: warning.message, severity: warning.severity === "ERROR" ? "HIGH" : warning.severity === "WARNING" ? "MEDIUM" : "LOW", recoverable: true } satisfies CapabilityWarning)),
        ...rendered.warnings.map((warning) => ({ code: warning.code, message: warning.message, severity: "MEDIUM" as const, ...(warning.irNodeId ? { nodeId: warning.irNodeId } : {}), recoverable: true }))
      ];
      const failures: CapabilityFailure[] = rendered.failures.map((failure) => ({ code: failure.code, message: failure.message, ...(failure.irNodeId ? { nodeId: failure.irNodeId } : {}) }));
      context.reportProgress({ phase: rendered.status === "COMPLETED" ? "COMPLETED" : rendered.status, progress: 1, message: rendered.status === "COMPLETED" ? "Website import completed." : "Website import did not complete." });

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

export const websiteImportCapability = createWebsiteImportCapability();

function toSafeErrorCode(error: unknown, fallback: string): string {
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && /^[A-Z0-9_]+$/.test(message)) return message;
  }
  return fallback;
}

function toSafeErrorDetail(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message ?? "") : String(error ?? "");
  if (!message || message === "ANALYZE_FETCH_FAILED" || message.includes("[object Object]")) return undefined;
  return message.replace(/https?:\/\/[^\s]+/gi, "[url]").slice(0, 120);
}

function failureResult(context: { capabilityId: string; operationId: string; now(): string }, code: string, message: string): CapabilityResult {
  const timestamp = context.now();
  return {
    capabilityId: context.capabilityId,
    operationId: context.operationId,
    success: false,
    processedCount: 0,
    createdCount: 0,
    changedCount: 0,
    skippedCount: 0,
    failedCount: 1,
    warnings: [],
    failures: [{ code, message }],
    startedAt: timestamp,
    completedAt: timestamp
  };
}
