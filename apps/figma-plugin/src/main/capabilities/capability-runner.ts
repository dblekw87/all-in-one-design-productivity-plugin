import {
  createNotImplementedResult,
  type CapabilityFailure,
  type CapabilityResult,
  type OperationId,
  type SelectionSummary
} from "@aio/shared-contracts";
import type { CapabilityRegistry } from "./capability-registry";
import type { OperationRegistry } from "./operation-registry";
import type { ProgressReporter } from "./progress-reporter";

export interface CapabilityRunCommand {
  capabilityId: string;
  operationId: OperationId;
  input: unknown;
}

export interface CapabilityRunner {
  run(command: CapabilityRunCommand): Promise<CapabilityResult>;
  cancel(operationId: OperationId): { operationId: OperationId; cancelled: boolean; reason?: string };
}

export interface CapabilityRunnerOptions {
  capabilityRegistry: CapabilityRegistry;
  operationRegistry: OperationRegistry;
  getSelection(): SelectionSummary;
  createProgressReporter(operationId: OperationId, capabilityId: string): ProgressReporter;
  now?: () => string;
}

export function createCapabilityRunner(options: CapabilityRunnerOptions): CapabilityRunner {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async run(command) {
      const capability = options.capabilityRegistry.get(command.capabilityId);
      if (!capability) {
        return failureResult(command.capabilityId, command.operationId, "CAPABILITY_NOT_FOUND", now());
      }

      if (!capability.metadata.enabled) {
        return failureResult(command.capabilityId, command.operationId, "CAPABILITY_DISABLED", now());
      }

      const parsedInput = capability.inputSchema.safeParse(command.input);
      if (!parsedInput.success) {
        return failureResult(command.capabilityId, command.operationId, "CAPABILITY_INPUT_INVALID", now(), {
          code: "CAPABILITY_INPUT_INVALID",
          message: "Capability input failed schema validation.",
          cause: parsedInput.error.issues
            .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
            .join("; ")
        });
      }

      const controller = createRuntimeAbortController();
      const startedAt = now();
      options.operationRegistry.register({
        operationId: command.operationId,
        capabilityId: command.capabilityId,
        controller,
        startedAt
      });

      const progressReporter = options.createProgressReporter(command.operationId, command.capabilityId);
      const context = {
        operationId: command.operationId,
        capabilityId: command.capabilityId,
        selection: options.getSelection(),
        signal: controller.signal,
        reportProgress: progressReporter.report,
        now
      };

      try {
        const validation = await capability.validate(context, parsedInput.data);
        if (!validation.valid) {
          return normalizeResult({
            capabilityId: command.capabilityId,
            operationId: command.operationId,
            success: false,
            processedCount: 0,
            createdCount: 0,
            changedCount: 0,
            skippedCount: 0,
            failedCount: validation.failures.length,
            warnings: validation.warnings,
            failures: validation.failures,
            startedAt,
            completedAt: now()
          });
        }

        if (controller.signal.aborted) {
          return failureResult(command.capabilityId, command.operationId, "CAPABILITY_CANCELLED", startedAt);
        }

        const result = await capability.execute(context, validation.input);
        if (controller.signal.aborted && !result.failures.some((failure) => failure.code === "CAPABILITY_CANCELLED")) {
          return failureResult(command.capabilityId, command.operationId, "CAPABILITY_CANCELLED", startedAt);
        }

        return normalizeResult(result);
      } catch (error) {
        if (controller.signal.aborted) {
          return failureResult(command.capabilityId, command.operationId, "CAPABILITY_CANCELLED", startedAt);
        }

        return failureResult(command.capabilityId, command.operationId, "CAPABILITY_EXECUTION_FAILED", startedAt, {
          code: "CAPABILITY_EXECUTION_FAILED",
          message: error instanceof Error ? error.message : "Capability execution failed."
        });
      } finally {
        options.operationRegistry.complete(command.operationId);
      }
    },
    cancel(operationId) {
      const cancelled = options.operationRegistry.cancel(operationId);
      return cancelled
        ? { operationId, cancelled }
        : { operationId, cancelled, reason: "No running operation found." };
    }
  };
}

function failureResult(
  capabilityId: string,
  operationId: OperationId,
  code: CapabilityFailure["code"],
  startedAt: string,
  failure?: CapabilityFailure
): CapabilityResult {
  const completedAt = new Date().toISOString();
  return {
    ...createNotImplementedResult(capabilityId, operationId),
    success: false,
    failedCount: 1,
    failures: [
      failure ?? {
        code,
        message: code
      }
    ],
    startedAt,
    completedAt
  };
}

function normalizeResult(result: CapabilityResult): CapabilityResult {
  return {
    ...result,
    warnings: result.warnings ?? [],
    failures: result.failures ?? []
  };
}
import { createRuntimeAbortController } from "../runtime/abort-controller";
