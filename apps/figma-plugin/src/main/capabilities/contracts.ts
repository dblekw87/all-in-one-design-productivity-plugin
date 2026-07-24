import type {
  CapabilityFailure,
  CapabilityMetadata,
  CapabilityResult,
  CapabilityWarning,
  OperationId,
  SelectionSummary
} from "@aio/shared-contracts";
import type { ZodType } from "zod";

export interface CapabilityProgressUpdate {
  phase: string;
  progress: number;
  message?: string;
}

export interface CapabilityExecutionContext {
  operationId: OperationId;
  capabilityId: string;
  selection: SelectionSummary;
  signal: AbortSignal;
  reportProgress(progress: CapabilityProgressUpdate): void;
  now(): string;
}

export type CapabilityValidationResult<TValidatedInput> =
  | {
      valid: true;
      input: TValidatedInput;
      warnings: CapabilityWarning[];
    }
  | {
      valid: false;
      failures: CapabilityFailure[];
      warnings: CapabilityWarning[];
    };

export interface PluginCapability<
  TInput = unknown,
  TValidatedInput = TInput,
  TPreview = unknown,
  TResult extends CapabilityResult = CapabilityResult
> {
  metadata: CapabilityMetadata;
  inputSchema: ZodType<TInput>;
  validate(
    context: CapabilityExecutionContext,
    input: TInput
  ): Promise<CapabilityValidationResult<TValidatedInput>>;
  preview?(context: CapabilityExecutionContext, input: TValidatedInput): Promise<TPreview>;
  execute(context: CapabilityExecutionContext, input: TValidatedInput): Promise<TResult>;
  restore?(context: CapabilityExecutionContext, historyId: string): Promise<CapabilityResult>;
}
